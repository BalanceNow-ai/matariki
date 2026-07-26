import { NextRequest, NextResponse } from "next/server";
import { calculatePositionAgeMs } from "../store";
import {
  getLatestPositionAsync,
  hasLatestPositionAsync,
  getRequestLogAsync,
} from "../redis-store";
import { assessTracking, type TrackingCondition } from "../tracking-status";
import { tokensMatch } from "../auth";

export const dynamic = "force-dynamic";

/**
 * Where to send alerts. Any endpoint that accepts a JSON POST with a `text`
 * field works — Slack and Discord incoming webhooks, ntfy, and most others.
 */
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const CRON_SECRET = process.env.CRON_SECRET;

/** Conditions worth waking someone for. */
const ALERTING_CONDITIONS: TrackingCondition[] = [
  "no-contact",
  "no-gps-fix",
  "never-reported",
];

function alertMessage(condition: TrackingCondition, summary: string): string {
  const prefix =
    condition === "no-contact" || condition === "never-reported"
      ? "🔴 Matariki III tracking: no contact"
      : "🟠 Matariki III tracking: no GPS fix";

  return `${prefix}\n\n${summary}\n\nhttps://matarikiyacht.com/api/position/health`;
}

/**
 * GET /api/position/monitor
 *
 * Checks tracking health and sends an alert when it is degraded. Intended to
 * be called by the Vercel cron defined in vercel.json.
 *
 * Nothing called the health endpoint before this existed, which is why
 * tracking could stop for 45 days without anyone finding out.
 */
export async function GET(request: NextRequest) {
  // Vercel sets this header on cron invocations. Allow a manual run with the
  // same secret so the alert path can be tested without waiting for the cron.
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET) {
    const supplied = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : request.nextUrl.searchParams.get("token");
    if (!tokensMatch(supplied, CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  const [hasLive, position, requestLog] = await Promise.all([
    hasLatestPositionAsync(),
    getLatestPositionAsync(),
    getRequestLogAsync(),
  ]);

  const lastRequest = requestLog[0];
  const tracking = assessTracking({
    now,
    lastContactAt: lastRequest?.timestamp ?? null,
    lastFixAt: position.timestamp ?? null,
    fixAgeMs: calculatePositionAgeMs(position),
    hasLiveFix: hasLive && position.source !== "fallback",
  });

  const shouldAlert = ALERTING_CONDITIONS.includes(tracking.condition);

  if (!shouldAlert) {
    return NextResponse.json({
      checked: new Date(now).toISOString(),
      condition: tracking.condition,
      summary: tracking.summary,
      alerted: false,
    });
  }

  if (!ALERT_WEBHOOK_URL) {
    // Still surface it in the function logs — an unconfigured alert channel
    // must not turn a real problem into silence.
    console.error("[Monitor] Tracking degraded but ALERT_WEBHOOK_URL is unset:", tracking.summary);
    return NextResponse.json({
      checked: new Date(now).toISOString(),
      condition: tracking.condition,
      summary: tracking.summary,
      alerted: false,
      reason: "ALERT_WEBHOOK_URL is not configured",
    });
  }

  const text = alertMessage(tracking.condition, tracking.summary);

  try {
    const response = await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `text` suits Slack and ntfy; `content` suits Discord. Sending both
      // means one payload works with whichever URL is configured.
      body: JSON.stringify({ text, content: text }),
    });

    if (!response.ok) {
      console.error("[Monitor] Alert webhook rejected the message:", response.status);
    }

    return NextResponse.json({
      checked: new Date(now).toISOString(),
      condition: tracking.condition,
      summary: tracking.summary,
      alerted: response.ok,
      alertStatus: response.status,
    });
  } catch (error) {
    console.error("[Monitor] Failed to send alert:", error);
    return NextResponse.json(
      {
        checked: new Date(now).toISOString(),
        condition: tracking.condition,
        summary: tracking.summary,
        alerted: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
