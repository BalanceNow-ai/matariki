import { NextRequest, NextResponse } from "next/server";
import { SignalKPosition, type RequestLogEntry } from "./store";
import {
  getLatestPositionAsync,
  setLatestPositionAsync,
  addRequestLogAsync,
} from "./redis-store";

// Re-export type for consumers
export type { SignalKPosition } from "./store";

// Secret token to authenticate position updates from Signal K
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * GET /api/position
 * Returns the latest position of Matariki III
 */
export async function GET() {
  const position = await getLatestPositionAsync();
  return NextResponse.json(position);
}

/**
 * POST /api/position
 * Receives position updates from Signal K on Cerbo GX
 *
 * Expected payload from Signal K webhook:
 * {
 *   "updates": [{
 *     "values": [{
 *       "path": "navigation.position",
 *       "value": { "latitude": -35.7275, "longitude": 174.3278 }
 *     }]
 *   }]
 * }
 *
 * Or simplified format:
 * {
 *   "latitude": -35.7275,
 *   "longitude": 174.3278,
 *   "courseOverGround": 180.5,
 *   "speedOverGround": 3.5
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logEntry: Partial<RequestLogEntry> = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    method: "POST",
  };

  // Verify secret token - support multiple auth methods
  // 1. Authorization header (Bearer token or Basic auth)
  // 2. X-Auth-Token header (msp-webhook style)
  // 3. X-API-Key header (common API pattern)
  // 4. API-Key header (alternative)
  // 5. Query parameter (?token=xxx or ?secret=xxx or ?api_key=xxx)
  const authHeader = request.headers.get("authorization");
  const xAuthToken = request.headers.get("x-auth-token");
  const xApiKey = request.headers.get("x-api-key");
  const apiKey = request.headers.get("api-key");
  const queryToken = request.nextUrl.searchParams.get("token");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const queryApiKey = request.nextUrl.searchParams.get("api_key");
  const queryAuthKey = request.nextUrl.searchParams.get("auth_key"); // msp-webhook default

  // Extract token from various formats
  let token: string | null = null;
  let authMethod = "none";

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      authMethod = "bearer";
    } else if (authHeader.startsWith("Basic ")) {
      // Decode Basic auth and use password as token
      try {
        const decoded = atob(authHeader.substring(6));
        const [, password] = decoded.split(":");
        token = password || null;
        authMethod = "basic";
      } catch {
        authMethod = "basic-invalid";
      }
    } else {
      // Raw Authorization header value
      token = authHeader;
      authMethod = "authorization-raw";
    }
  } else if (xAuthToken) {
    token = xAuthToken;
    authMethod = "x-auth-token";
  } else if (xApiKey) {
    token = xApiKey;
    authMethod = "x-api-key";
  } else if (apiKey) {
    token = apiKey;
    authMethod = "api-key";
  } else if (queryToken) {
    token = queryToken;
    authMethod = "query-token";
  } else if (querySecret) {
    token = querySecret;
    authMethod = "query-secret";
  } else if (queryApiKey) {
    token = queryApiKey;
    authMethod = "query-api_key";
  } else if (queryAuthKey) {
    token = queryAuthKey;
    authMethod = "query-auth_key";
  }

  // Log auth details for debugging
  logEntry.tokenPreview = token ? `${token.substring(0, 8)}...` : undefined;
  logEntry.authMethod = authMethod;

  // Log all received headers for debugging (only auth-related ones)
  logEntry.receivedAuthHeaders = {
    authorization: authHeader ? `${authHeader.substring(0, 20)}...` : null,
    "x-auth-token": xAuthToken ? `${xAuthToken.substring(0, 8)}...` : null,
    "x-api-key": xApiKey ? `${xApiKey.substring(0, 8)}...` : null,
    "api-key": apiKey ? `${apiKey.substring(0, 8)}...` : null,
  };

  if (SIGNALK_SECRET && token !== SIGNALK_SECRET) {
    logEntry.authStatus = "failed";
    logEntry.responseStatus = 401;
    logEntry.responseBody = { error: "Unauthorized" };
    logEntry.payloadFormat = "unknown";
    logEntry.payloadSize = 0;
    logEntry.rawPayload = "(not parsed - auth failed)";
    logEntry.processingTimeMs = Date.now() - startTime;
    await addRequestLogAsync(logEntry as RequestLogEntry);

    console.log("[Signal K] Auth failed - method:", authMethod, "token:", token?.substring(0, 8) + "...", "expected:", SIGNALK_SECRET?.substring(0, 8) + "...");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logEntry.authStatus = SIGNALK_SECRET ? "success" : "no-secret";

  try {
    const bodyText = await request.text();
    logEntry.payloadSize = bodyText.length;

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
      logEntry.rawPayload = body;
    } catch {
      logEntry.payloadFormat = "invalid";
      logEntry.responseStatus = 400;
      logEntry.responseBody = { error: "Invalid JSON" };
      logEntry.error = "JSON parse failed";
      logEntry.processingTimeMs = Date.now() - startTime;
      await addRequestLogAsync(logEntry as RequestLogEntry);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Handle Signal K delta format
    if (body.updates && Array.isArray(body.updates)) {
      logEntry.payloadFormat = "signalk-delta";
      const position = parseSignalKDelta(body as { updates: Array<{ values: Array<{ path: string; value: unknown }> }> });
      if (position) {
        await setLatestPositionAsync(position);
        logEntry.parsedPosition = position;
        logEntry.responseStatus = 200;
        logEntry.responseBody = { success: true, position };
        logEntry.processingTimeMs = Date.now() - startTime;
        await addRequestLogAsync(logEntry as RequestLogEntry);

        console.log("[Signal K] Position updated:", position.latitude, position.longitude);
        return NextResponse.json({ success: true, position });
      }
    }

    // Handle simplified format (including Morvargh/MSP webhook format)
    if (body.latitude !== undefined && body.longitude !== undefined) {
      logEntry.payloadFormat = "simplified";
      const position: SignalKPosition = {
        latitude: body.latitude as number,
        longitude: body.longitude as number,
        altitude: body.altitude as number | undefined,
        timestamp: (body.timestamp as string) || new Date().toISOString(),
        source: "signalk",
        // Navigation data
        courseOverGround: (body.courseOverGround || body.cog) as number | undefined,
        speedOverGround: (body.speedOverGround || body.sog) as number | undefined,
        heading: (body.heading || body.trueHeading) as number | undefined,
        tripLog: body.tripLog as number | undefined,
        depth: body.depth as number | undefined,
        // Wind data
        apparentWindSpeed: (body.apparentWindSpeed || body.aws) as number | undefined,
        apparentWindAngle: (body.apparentWindAngle || body.awa) as number | undefined,
        // Environment data
        waterTemperature: (body.waterTemperature || body.waterTemp) as number | undefined,
        barometricPressure: (body.barometricPressure || body.pressure) as number | undefined,
        // Vessel info
        name: (body.name as string) || "Matariki III",
        mmsi: (body.mmsi as string) || "512004962",
      };

      await setLatestPositionAsync(position);
      logEntry.parsedPosition = position;
      logEntry.responseStatus = 200;
      logEntry.responseBody = { success: true, position };
      logEntry.processingTimeMs = Date.now() - startTime;
      await addRequestLogAsync(logEntry as RequestLogEntry);

      console.log("[Signal K] Position updated:", position.latitude, position.longitude,
        "SOG:", position.speedOverGround, "AWS:", position.apparentWindSpeed);
      return NextResponse.json({ success: true, position });
    }

    // Handle nested position format from msp-webhook/Signal K
    // Format: { position: { value: { latitude, longitude } }, speed: { value, unit }, ... }
    const nestedPosition = body.position as { value?: { latitude?: number; longitude?: number; changedOn?: number } } | null | undefined;

    // If position is explicitly null (msp-webhook sends this when GPS has no fix),
    // acknowledge the request but don't update position
    if (body.position === null || (nestedPosition && nestedPosition.value === undefined)) {
      logEntry.payloadFormat = "nested-position";
      logEntry.responseStatus = 200;
      logEntry.responseBody = { success: true, message: "No position data in payload, skipped update" };
      logEntry.processingTimeMs = Date.now() - startTime;
      await addRequestLogAsync(logEntry as RequestLogEntry);

      console.log("[Signal K] Received request with null position, skipping update");
      return NextResponse.json({ success: true, message: "No position data in payload, skipped update" });
    }

    if (nestedPosition?.value?.latitude !== undefined && nestedPosition?.value?.longitude !== undefined) {
      logEntry.payloadFormat = "nested-position";

      // Helper to extract numeric value from various formats
      const extractNumber = (data: unknown): number | undefined => {
        if (typeof data === 'number') return data;
        if (typeof data === 'object' && data !== null && 'value' in data) {
          const val = (data as { value?: unknown }).value;
          return typeof val === 'number' ? val : undefined;
        }
        return undefined;
      };

      // Extract speed value (comes as m/s, convert to knots)
      const speedMs = extractNumber(body.speed);
      const speedKnots = speedMs !== undefined ? speedMs * 1.94384 : undefined; // m/s to knots

      // Extract course over ground (comes as radians, convert to degrees)
      const cogRadians = extractNumber(body.cog) ?? extractNumber(body.courseOverGround);
      const cogDegrees = cogRadians !== undefined ? cogRadians * (180 / Math.PI) : undefined;

      // Extract heading value (comes as radians, convert to degrees)
      const headingRadians = extractNumber(body.heading);
      const headingDegrees = headingRadians !== undefined ? headingRadians * (180 / Math.PI) : undefined;

      // Extract depth value
      const depthValue = extractNumber(body.depth) ?? extractNumber(body.depthBelowTransducer);

      // Extract water temperature
      const waterTemp = extractNumber(body.wTemp) ?? extractNumber(body.waterTemperature);

      // Extract barometric pressure (convert from Pa to hPa if needed)
      let pressureValue = extractNumber(body.pressure) ?? extractNumber(body.barometricPressure);
      if (pressureValue !== undefined && pressureValue > 10000) {
        // If value > 10000, it's likely in Pa, convert to hPa
        pressureValue = pressureValue / 100;
      }

      // Extract wind speed (convert m/s to knots)
      const windSpeedMs = extractNumber(body.windSpeed) ?? extractNumber(body.apparentWindSpeed);
      const windSpeedKnots = windSpeedMs !== undefined ? windSpeedMs * 1.94384 : undefined;

      // Extract wind angle (comes as radians, convert to degrees)
      const windAngleRadians = extractNumber(body.windAngle) ?? extractNumber(body.apparentWindAngle);
      const windAngleDegrees = windAngleRadians !== undefined ? windAngleRadians * (180 / Math.PI) : undefined;

      // Extract log (trip distance)
      const tripLog = extractNumber(body.log) ?? extractNumber(body.tripLog);

      const position: SignalKPosition = {
        latitude: nestedPosition.value.latitude,
        longitude: nestedPosition.value.longitude,
        timestamp: (body.datetime as string) || new Date().toISOString(),
        source: "signalk",
        // Navigation data
        speedOverGround: speedKnots,
        courseOverGround: cogDegrees,
        heading: headingDegrees,
        depth: depthValue,
        tripLog: tripLog,
        // Wind data
        apparentWindSpeed: windSpeedKnots,
        apparentWindAngle: windAngleDegrees,
        // Environment data
        waterTemperature: waterTemp,
        barometricPressure: pressureValue,
        // Vessel info
        name: "Matariki III",
        mmsi: "512004962",
      };

      await setLatestPositionAsync(position);
      logEntry.parsedPosition = position;
      logEntry.responseStatus = 200;
      logEntry.responseBody = { success: true, position };
      logEntry.processingTimeMs = Date.now() - startTime;
      await addRequestLogAsync(logEntry as RequestLogEntry);

      console.log("[Signal K] Position updated (nested format):", position.latitude, position.longitude,
        "SOG:", position.speedOverGround?.toFixed(1), "kts");
      return NextResponse.json({ success: true, position });
    }

    logEntry.payloadFormat = "invalid";
    logEntry.responseStatus = 400;
    logEntry.responseBody = { error: "Invalid payload format" };
    logEntry.error = "No latitude/longitude or Signal K delta found";
    logEntry.processingTimeMs = Date.now() - startTime;
    await addRequestLogAsync(logEntry as RequestLogEntry);

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
  } catch (error) {
    logEntry.responseStatus = 400;
    logEntry.responseBody = { error: "Invalid JSON" };
    logEntry.error = String(error);
    logEntry.processingTimeMs = Date.now() - startTime;
    await addRequestLogAsync(logEntry as RequestLogEntry);

    console.error("[Signal K] Error processing position:", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

/**
 * Parse Signal K delta format to extract position
 */
function parseSignalKDelta(delta: { updates: Array<{ values: Array<{ path: string; value: unknown }> }> }): SignalKPosition | null {
  let position: Partial<SignalKPosition> = {
    timestamp: new Date().toISOString(),
    source: "signalk",
    name: "Matariki III",
    mmsi: "512004962",
  };

  for (const update of delta.updates) {
    for (const item of update.values) {
      switch (item.path) {
        case "navigation.position":
          const pos = item.value as { latitude: number; longitude: number; altitude?: number };
          position.latitude = pos.latitude;
          position.longitude = pos.longitude;
          position.altitude = pos.altitude;
          break;
        case "navigation.courseOverGroundTrue":
          position.courseOverGround = (item.value as number) * (180 / Math.PI); // radians to degrees
          break;
        case "navigation.speedOverGround":
          position.speedOverGround = item.value as number; // m/s
          break;
        case "navigation.headingTrue":
          position.heading = (item.value as number) * (180 / Math.PI);
          break;
      }
    }
  }

  if (position.latitude !== undefined && position.longitude !== undefined) {
    return position as SignalKPosition;
  }

  return null;
}
