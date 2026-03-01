import { NextRequest, NextResponse } from "next/server";

// In-memory store (for demo - use Vercel KV or Sanity in production)
// This will persist across requests in the same serverless instance
let latestPosition: SignalKPosition | null = null;

export type SignalKPosition = {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  source: "signalk";
  // Navigation data from Signal K
  courseOverGround?: number; // degrees
  speedOverGround?: number; // m/s
  heading?: number; // degrees
  // Vessel info
  name?: string;
  mmsi?: string;
};

// Secret token to authenticate position updates from Signal K
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * GET /api/position
 * Returns the latest position of Matariki III
 */
export async function GET() {
  if (!latestPosition) {
    // Return fallback position (Whangarei Marina)
    return NextResponse.json({
      latitude: -35.7275,
      longitude: 174.3278,
      timestamp: new Date().toISOString(),
      source: "fallback" as const,
      name: "Matariki III",
      location: "Whangarei, New Zealand",
    });
  }

  return NextResponse.json(latestPosition);
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
  // Verify secret token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (SIGNALK_SECRET && token !== SIGNALK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Handle Signal K delta format
    if (body.updates && Array.isArray(body.updates)) {
      const position = parseSignalKDelta(body);
      if (position) {
        latestPosition = position;
        console.log("[Signal K] Position updated:", position.latitude, position.longitude);
        return NextResponse.json({ success: true, position });
      }
    }

    // Handle simplified format
    if (body.latitude !== undefined && body.longitude !== undefined) {
      latestPosition = {
        latitude: body.latitude,
        longitude: body.longitude,
        altitude: body.altitude,
        timestamp: body.timestamp || new Date().toISOString(),
        source: "signalk",
        courseOverGround: body.courseOverGround || body.cog,
        speedOverGround: body.speedOverGround || body.sog,
        heading: body.heading,
        name: body.name || "Matariki III",
        mmsi: body.mmsi || "512004962",
      };

      console.log("[Signal K] Position updated:", latestPosition.latitude, latestPosition.longitude);
      return NextResponse.json({ success: true, position: latestPosition });
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
  } catch (error) {
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
