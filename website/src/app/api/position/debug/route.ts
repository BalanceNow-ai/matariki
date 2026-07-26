import { NextRequest, NextResponse } from "next/server";
import {
  getLatestPositionAsync,
  getPositionHistoryAsync,
  getRequestLogAsync,
  clearRequestLogAsync,
  hasLatestPositionAsync,
  isRedisConfigured,
} from "../redis-store";
import { calculatePositionAgeMs } from "../store";
import { requireAuth } from "../auth";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

/**
 * GET /api/position/debug
 * Returns request logs and current position state for debugging
 */
export async function GET() {
  try {
    // A failed history read must not be reported as "0 positions stored" —
    // that is what made a broken read look identical to lost data.
    let historySize: number | null = null;
    let historyError: string | null = null;

    const [position, requestLog, hasLive] = await Promise.all([
      getLatestPositionAsync(),
      getRequestLogAsync(),
      hasLatestPositionAsync(),
    ]);

    try {
      historySize = (await getPositionHistoryAsync()).length;
    } catch (error) {
      historyError = error instanceof Error ? error.message : String(error);
      console.error("[Debug API] History read failed:", error);
    }

    // Calculate stats
    const last5Minutes = requestLog.filter((r) => {
      const age = Date.now() - new Date(r.timestamp).getTime();
      return age < 5 * 60 * 1000;
    });

    const authStats = {
      success: requestLog.filter((r) => r.authStatus === "success").length,
      failed: requestLog.filter((r) => r.authStatus === "failed").length,
      noSecret: requestLog.filter((r) => r.authStatus === "no-secret").length,
    };

    // Count auth methods used
    const authMethods: Record<string, number> = {};
    for (const r of requestLog) {
      const method = (r as { authMethod?: string }).authMethod || "none";
      authMethods[method] = (authMethods[method] || 0) + 1;
    }

    const formatStats = {
      signalkDelta: requestLog.filter((r) => r.payloadFormat === "signalk-delta").length,
      simplified: requestLog.filter((r) => r.payloadFormat === "simplified").length,
      nestedPosition: requestLog.filter((r) => r.payloadFormat === "nested-position").length,
      invalid: requestLog.filter((r) => r.payloadFormat === "invalid").length,
    };

    const avgProcessingTime =
      requestLog.length > 0
        ? requestLog.reduce((acc, r) => acc + r.processingTimeMs, 0) / requestLog.length
        : 0;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      storage: isRedisConfigured() ? "redis" : "memory",
      currentPosition: {
        hasLiveData: hasLive && position.source === "signalk",
        source: position.source,
        latitude: position.latitude,
        longitude: position.longitude,
        lastUpdate: position.timestamp,
        ageMs: calculatePositionAgeMs(position),
      },
      stats: {
        totalRequests: requestLog.length,
        requestsLast5Min: last5Minutes.length,
        historySize,
        historyError,
        authStats,
        authMethods,
        formatStats,
        avgProcessingTimeMs: Math.round(avgProcessingTime * 100) / 100,
      },
      requestLog,
      webhookConfigured: !!process.env.SIGNALK_WEBHOOK_SECRET,
      supportedAuthFormats: {
        note: "Configure your webhook to use one of these authentication methods",
        headers: [
          "Authorization: Bearer <your-secret>",
          "Authorization: Basic base64(username:your-secret)",
          "X-Auth-Token: <your-secret>",
          "X-API-Key: <your-secret>",
          "API-Key: <your-secret>",
        ],
        queryParams: [
          "?auth_key=<your-secret> (msp-webhook default)",
          "?token=<your-secret>",
          "?secret=<your-secret>",
          "?api_key=<your-secret>",
        ],
      },
    });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/position/debug
 * Clears the request log. Authenticated — the log is the only record of what
 * the boat actually sent, and is the first thing consulted when tracking fails.
 */
export async function DELETE(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  await clearRequestLogAsync();
  return NextResponse.json({ success: true, message: "Request log cleared" });
}

/**
 * POST /api/position/debug
 * Sends a test position to the position endpoint.
 *
 * Authenticated: this writes a synthetic position into the live track using
 * the server's own webhook secret, so leaving it open let anyone move the
 * vessel on the public map.
 */
export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const format = request.nextUrl.searchParams.get("format") || "simplified";
  const fail = request.nextUrl.searchParams.get("fail") === "true";

  let testPayload: Record<string, unknown>;

  if (format === "signalk-delta") {
    testPayload = {
      updates: [
        {
          values: [
            {
              path: "navigation.position",
              value: {
                latitude: -35.7275 + (Math.random() - 0.5) * 0.01,
                longitude: 174.3278 + (Math.random() - 0.5) * 0.01,
              },
            },
            {
              path: "navigation.speedOverGround",
              value: 2.57, // m/s
            },
            {
              path: "navigation.courseOverGroundTrue",
              value: Math.PI, // radians (180°)
            },
          ],
        },
      ],
    };
  } else if (fail) {
    testPayload = {
      // Missing lat/lon to trigger failure
      invalidField: "test",
    };
  } else {
    testPayload = {
      latitude: -35.7275 + (Math.random() - 0.5) * 0.01,
      longitude: 174.3278 + (Math.random() - 0.5) * 0.01,
      speedOverGround: 5.2,
      courseOverGround: 180,
      heading: 175,
      depth: 12.5,
      apparentWindSpeed: 8.3,
      apparentWindAngle: 45,
      waterTemperature: 18.5,
      timestamp: new Date().toISOString(),
    };
  }

  const webhookSecret = process.env.SIGNALK_WEBHOOK_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/position`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret && !fail ? { Authorization: `Bearer ${webhookSecret}` } : {}),
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();

    return NextResponse.json({
      testType: format,
      success: response.ok,
      statusCode: response.status,
      result,
      sentPayload: testPayload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        testType: format,
        success: false,
        error: String(error),
        sentPayload: testPayload,
      },
      { status: 500 }
    );
  }
}
