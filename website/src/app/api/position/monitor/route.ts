import { NextRequest, NextResponse } from "next/server";
import { calculatePositionAgeMs } from "../store";
import {
  getLatestPositionAsync,
  hasLatestPositionAsync,
  getRequestLogAsync,
  getAlertStateAsync,
  setAlertStateAsync,
  clearAlertStateAsync,
} from "../redis-store";
import { assessTracking, formatAge, type TrackingCondition } from "../tracking-status";
import {
  buildAlertRequest,
  decideAlert,
  detectAlertFormat,
  type AlertSeverity,
} from "../alert";
import { tokensMatch } from "../auth";

export const dynamic = "force-dynamic";

/**
 * Where to send alerts. The format is detected from the URL — Slack, Discord
 * and ntfy each want a different request shape. ALERT_WEBHOOK_FORMAT overrides
 * the detection, which a self-hosted ntfy instance needs.
 */
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const ALERT_WEBHOOK_FORMAT = process.env.ALERT_WEBHOOK_FORMAT;
const CRON_SECRET = process.env.CRON_SECRET;

/** How long a persisting fault stays quiet before it is repeated. */
const REMINDER_INTERVAL_MS = 24 * 60 * 60_000;

/** Conditions worth notifying about. */
const ALERTING_CONDITIONS: TrackingCondition[] = [
  "no-contact",
  "no-gps-fix",
  "never-reported",
];

function severityFor(condition: string): AlertSeverity {
  // Silence is more serious than a lost fix: one means the vessel is not
  // reachable at all, the other that it is fine but its GPS is not.
  return condition === "no-contact" || condition === "never-reported"
    ? "critical"
    : "warning";
}

function titleFor(condition: string): string {
  switch (condition) {
    case "no-contact":
      return "Matariki III: no contact";
    case "never-reported":
      return "Matariki III: never reported";
    case "no-gps-fix":
      return "Matariki III: no GPS fix";
    default:
      return "Matariki III: tracking restored";
  }
}

const HEALTH_URL = `${process.env.NEXT_PUBLIC_SITE_URL || "https://matarikiyacht.com"}/api/position/health`;

/**
 * GET /api/position/monitor
 *
 * Checks tracking health and notifies when it changes. Called by the Vercel
 * cron in vercel.json.
 *
 * Nothing called the health endpoint before this existed, which is why
 * tracking could stop for 45 days without anyone finding out.
 */
export async function GET(request: NextRequest) {
  // Vercel sends CRON_SECRET as a Bearer token on cron invocations. A manual
  // run with the same token is allowed so the alert path can be tested without
  // waiting for the schedule.
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const supplied = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : request.nextUrl.searchParams.get("token");
    if (!tokensMatch(supplied, CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  const [hasLive, position, requestLog, previousState] = await Promise.all([
    hasLatestPositionAsync(),
    getLatestPositionAsync(),
    getRequestLogAsync(),
    getAlertStateAsync(),
  ]);

  const lastRequest = requestLog[0];
  const tracking = assessTracking({
    now,
    lastContactAt: lastRequest?.timestamp ?? null,
    lastFixAt: position.timestamp ?? null,
    fixAgeMs: calculatePositionAgeMs(position),
    hasLiveFix: hasLive && position.source !== "fallback",
  });

  const isDegraded = ALERTING_CONDITIONS.includes(tracking.condition);

  const decision = decideAlert({
    now,
    condition: tracking.condition,
    isDegraded,
    previous: previousState,
    reminderIntervalMs: REMINDER_INTERVAL_MS,
    severityFor,
  });

  const baseResponse = {
    checked: new Date(now).toISOString(),
    condition: tracking.condition,
    summary: tracking.summary,
    decision: decision.reason,
  };

  if (!decision.send) {
    // Keep `since` from the original sighting so a reminder can say how long
    // the fault has been running.
    if (isDegraded && previousState) {
      await setAlertStateAsync({ ...previousState, condition: tracking.condition });
    }
    return NextResponse.json({ ...baseResponse, alerted: false });
  }

  const isRecovery = decision.reason === "recovered";
  const since = previousState?.since;
  const duration =
    since && Number.isFinite(new Date(since).getTime())
      ? formatAge(now - new Date(since).getTime())
      : null;

  const message = isRecovery
    ? `Tracking is working again${duration ? ` after ${duration}` : ""}.\n\n${tracking.summary}\n\n${HEALTH_URL}`
    : `${tracking.summary}${
        decision.reason === "reminder" && duration
          ? `\n\nStill unresolved after ${duration}.`
          : ""
      }\n\n${HEALTH_URL}`;

  const title = isRecovery ? "Matariki III: tracking restored" : titleFor(tracking.condition);

  if (!ALERT_WEBHOOK_URL) {
    // Surface it in the function logs regardless — an unconfigured alert
    // channel must not turn a real problem into silence.
    console.error("[Monitor] Tracking degraded but ALERT_WEBHOOK_URL is unset:", tracking.summary);
    return NextResponse.json({
      ...baseResponse,
      alerted: false,
      reason: "ALERT_WEBHOOK_URL is not configured",
    });
  }

  const format = detectAlertFormat(ALERT_WEBHOOK_URL, ALERT_WEBHOOK_FORMAT);
  const { body, headers } = buildAlertRequest({
    format,
    title,
    message,
    severity: decision.severity,
  });

  try {
    const response = await fetch(ALERT_WEBHOOK_URL, { method: "POST", headers, body });

    if (!response.ok) {
      console.error("[Monitor] Alert webhook rejected the message:", response.status);
      // Do not record a notification that did not arrive, so the next run
      // tries again rather than assuming this fault was reported.
      return NextResponse.json(
        { ...baseResponse, alerted: false, format, alertStatus: response.status },
        { status: 502 }
      );
    }

    if (isRecovery) {
      await clearAlertStateAsync();
    } else {
      await setAlertStateAsync({
        condition: tracking.condition,
        notifiedAt: new Date(now).toISOString(),
        since: previousState?.since ?? new Date(now).toISOString(),
      });
    }

    return NextResponse.json({ ...baseResponse, alerted: true, format });
  } catch (error) {
    console.error("[Monitor] Failed to send alert:", error);
    return NextResponse.json(
      {
        ...baseResponse,
        alerted: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
