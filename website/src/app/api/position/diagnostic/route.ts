import { NextRequest, NextResponse } from "next/server";
import {
  getLatestPosition,
  hasLatestPosition,
  getPositionHistory,
  calculatePositionAgeMs,
} from "../store";

interface DiagnosticResult {
  status: "pass" | "fail" | "warn";
  message: string;
  detail?: string;
}

interface DiagnosticReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, DiagnosticResult>;
  position: {
    hasLiveData: boolean;
    source: string;
    latitude: number;
    longitude: number;
    lastUpdate: string;
    age: string;
    historyCount: number;
  };
  rawPosition: ReturnType<typeof getLatestPosition>;
}

/**
 * GET /api/position/diagnostic
 * Returns diagnostic information about position data flow
 */
export async function GET() {
  const checks: Record<string, DiagnosticResult> = {};

  // Check 1: SIGNALK_WEBHOOK_SECRET configured
  const webhookSecret = process.env.SIGNALK_WEBHOOK_SECRET;
  if (webhookSecret) {
    checks.webhookSecretConfigured = {
      status: "pass",
      message: "Webhook secret is configured",
      detail: `Secret starts with: ${webhookSecret.substring(0, 8)}...`,
    };
  } else {
    checks.webhookSecretConfigured = {
      status: "warn",
      message: "No webhook secret configured - endpoint accepts any requests",
      detail: "Set SIGNALK_WEBHOOK_SECRET environment variable for security",
    };
  }

  // Check 2: Live position data received
  const hasLive = hasLatestPosition();
  const position = getLatestPosition();
  const history = getPositionHistory();

  if (hasLive && position.source === "signalk") {
    const ageMs = calculatePositionAgeMs(position);
    const ageMinutes = Math.floor(ageMs / 60000);

    if (ageMinutes < 5) {
      checks.liveDataReceived = {
        status: "pass",
        message: `Live Signal K data received ${ageMinutes === 0 ? "just now" : `${ageMinutes} minutes ago`}`,
        detail: `Position: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`,
      };
    } else if (ageMinutes < 30) {
      checks.liveDataReceived = {
        status: "warn",
        message: `Signal K data is ${ageMinutes} minutes old`,
        detail: "Data may be stale - check boat connectivity",
      };
    } else {
      checks.liveDataReceived = {
        status: "fail",
        message: `Signal K data is ${Math.floor(ageMinutes / 60)} hours old`,
        detail: "No recent updates - boat may be offline",
      };
    }
  } else {
    checks.liveDataReceived = {
      status: "fail",
      message: "No live Signal K data received",
      detail: "Using fallback position (Whangarei Marina)",
    };
  }

  // Check 3: Position history
  if (history.length > 0) {
    checks.positionHistory = {
      status: "pass",
      message: `${history.length} positions in history`,
      detail: `Oldest: ${history[history.length - 1]?.timestamp}`,
    };
  } else {
    checks.positionHistory = {
      status: "warn",
      message: "No position history available",
      detail: "History builds up as positions are received",
    };
  }

  // Check 4: Telemetry data present
  const hasTelemetry =
    position.speedOverGround !== undefined ||
    position.heading !== undefined ||
    position.depth !== undefined ||
    position.apparentWindSpeed !== undefined;

  if (position.source === "signalk" && hasTelemetry) {
    const fields = [];
    if (position.speedOverGround !== undefined) fields.push(`SOG: ${position.speedOverGround.toFixed(1)}kts`);
    if (position.heading !== undefined) fields.push(`HDG: ${position.heading.toFixed(0)}°`);
    if (position.depth !== undefined) fields.push(`Depth: ${position.depth.toFixed(1)}m`);
    if (position.apparentWindSpeed !== undefined) fields.push(`AWS: ${position.apparentWindSpeed.toFixed(1)}kts`);

    checks.telemetryData = {
      status: "pass",
      message: "Telemetry data present",
      detail: fields.join(", "),
    };
  } else if (position.source === "signalk") {
    checks.telemetryData = {
      status: "warn",
      message: "Position received but no telemetry data",
      detail: "Wind, depth, and speed data not being sent",
    };
  } else {
    checks.telemetryData = {
      status: "fail",
      message: "No telemetry data (using fallback)",
      detail: "Telemetry requires live Signal K connection",
    };
  }

  // Calculate overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overall: DiagnosticReport["overall"] = "healthy";
  if (statuses.includes("fail")) {
    overall = "unhealthy";
  } else if (statuses.includes("warn")) {
    overall = "degraded";
  }

  // Calculate age string
  const ageMs = calculatePositionAgeMs(position);
  let ageString: string;
  if (ageMs < 60000) {
    ageString = "Just now";
  } else if (ageMs < 3600000) {
    ageString = `${Math.floor(ageMs / 60000)} minutes ago`;
  } else if (ageMs < 86400000) {
    ageString = `${Math.floor(ageMs / 3600000)} hours ago`;
  } else {
    ageString = `${Math.floor(ageMs / 86400000)} days ago`;
  }

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    overall,
    checks,
    position: {
      hasLiveData: hasLive && position.source === "signalk",
      source: position.source,
      latitude: position.latitude,
      longitude: position.longitude,
      lastUpdate: position.timestamp,
      age: ageString,
      historyCount: history.length,
    },
    rawPosition: position,
  };

  return NextResponse.json(report);
}

/**
 * POST /api/position/diagnostic
 * Test the webhook endpoint with a test position
 */
export async function POST(request: NextRequest) {
  const testMode = request.nextUrl.searchParams.get("test") === "true";

  if (!testMode) {
    return NextResponse.json(
      { error: "Use ?test=true to send test position" },
      { status: 400 }
    );
  }

  // Create a test position update
  const testPayload = {
    latitude: -35.7275 + (Math.random() - 0.5) * 0.01, // Slight randomization
    longitude: 174.3278 + (Math.random() - 0.5) * 0.01,
    speedOverGround: 5.2,
    courseOverGround: 180,
    heading: 175,
    depth: 12.5,
    apparentWindSpeed: 8.3,
    apparentWindAngle: 45,
    waterTemperature: 18.5,
    barometricPressure: 1013.25,
    timestamp: new Date().toISOString(),
    name: "Matariki III",
    mmsi: "512004962",
  };

  // Call the main position endpoint internally
  const webhookSecret = process.env.SIGNALK_WEBHOOK_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/position`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      result,
      testPayload,
      note: "Test position sent to /api/position endpoint",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        testPayload,
      },
      { status: 500 }
    );
  }
}
