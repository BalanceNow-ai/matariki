import { NextResponse } from "next/server";
import { calculatePositionAgeMs } from "../store";
import {
  getLatestPositionAsync,
  hasLatestPositionAsync,
  getRequestLogAsync,
  getPermanentTrackAsync,
  getRecentPositionHistoryAsync,
  isRedisConfigured,
} from "../redis-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/position/health
 *
 * Quick health check designed to be curled from the boat.
 * Returns a single-screen summary of what's working and what's not.
 *
 * Usage:
 *   curl https://matarikiyacht.com/api/position/health
 *   curl https://matarikiyacht.com/api/position/health?test=1  (sends a test webhook)
 */
export async function GET() {
  const now = Date.now();

  const [hasLive, position, requestLog, permanentTrack, recentHistory] = await Promise.all([
    hasLatestPositionAsync(),
    getLatestPositionAsync(),
    getRequestLogAsync(),
    getPermanentTrackAsync(),
    getRecentPositionHistoryAsync(100), // just count, not full fetch
  ]);

  const ageMs = calculatePositionAgeMs(position);
  const isStale = ageMs > 10 * 60_000; // > 10 minutes

  // Analyse recent request log
  const recentRequests = requestLog.filter(
    (r) => now - new Date(r.timestamp).getTime() < 3_600_000
  );
  const recentFailures = recentRequests.filter((r) => r.responseStatus !== 200);
  const lastRequest = requestLog[0]; // most recent (LPUSH order)
  const lastRequestAge = lastRequest
    ? now - new Date(lastRequest.timestamp).getTime()
    : null;

  // Build status
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  checks.redis = {
    ok: isRedisConfigured(),
    detail: isRedisConfigured() ? "Connected" : "NOT configured - using ephemeral memory (data lost on restart)",
  };

  checks.webhook_secret = {
    ok: !!process.env.SIGNALK_WEBHOOK_SECRET,
    detail: process.env.SIGNALK_WEBHOOK_SECRET
      ? "Set"
      : "NOT set - endpoint accepts any request (insecure)",
  };

  checks.live_data = {
    ok: hasLive && position.source !== "fallback",
    detail: hasLive && position.source !== "fallback"
      ? `Source: ${position.source}`
      : "No live data received - using fallback position",
  };

  checks.position_age = {
    ok: !isStale,
    detail: isStale
      ? `STALE: last update ${formatAge(ageMs)} ago (${position.timestamp})`
      : `Fresh: ${formatAge(ageMs)} ago`,
  };

  checks.recent_webhooks = {
    ok: recentRequests.length > 0,
    detail: recentRequests.length > 0
      ? `${recentRequests.length} requests in last hour (${recentFailures.length} failed)`
      : lastRequest
        ? `No requests in last hour. Last request: ${formatAge(lastRequestAge!)} ago (HTTP ${lastRequest.responseStatus})`
        : "No requests logged at all",
  };

  // If there are recent failures, show the last error
  if (recentFailures.length > 0) {
    const lastFail = recentFailures[0];
    checks.last_error = {
      ok: false,
      detail: `HTTP ${lastFail.responseStatus} | auth: ${lastFail.authStatus} | format: ${lastFail.payloadFormat}${lastFail.error ? ` | ${lastFail.error}` : ""}`,
    };
  }

  checks.track_data = {
    ok: permanentTrack.length > 0,
    detail: `permanentTrack: ${permanentTrack.length} points, positionHistory (recent 100): ${recentHistory.length} points`,
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? "healthy" : "unhealthy",
    position: {
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: position.timestamp,
      age: formatAge(ageMs),
      source: position.source,
    },
    checks,
    test_webhook: `curl -X POST ${process.env.NEXT_PUBLIC_SITE_URL || "https://matarikiyacht.com"}/api/position -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_SECRET" -d '{"latitude":-46.96,"longitude":168.17,"speedOverGround":0.1}'`,
    diagnostic_url: "/diagnostic/track",
  });
}

function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}
