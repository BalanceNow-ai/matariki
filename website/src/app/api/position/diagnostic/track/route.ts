import { NextResponse } from "next/server";
import { calculatePositionAgeMs } from "../../store";
import type { SignalKPosition } from "../../store";
import {
  getLatestPositionAsync,
  hasLatestPositionAsync,
  getRecentPositionHistoryAsync,
  getPermanentTrackAsync,
  getLastTrackPositionAsync,
  getRequestLogAsync,
  isRedisConfigured,
} from "../../redis-store";

export const dynamic = "force-dynamic";

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

/**
 * GET /api/position/diagnostic/track
 *
 * Comprehensive diagnostic for track movement issues.
 * Checks both data stores (positionHistory vs permanentTrack),
 * identifies why the track line might not show recent movement,
 * and provides actionable recommendations.
 */
export async function GET() {
  const now = Date.now();

  const [hasLive, latestPosition, positionHistory, permanentTrack, lastTrackPos, requestLog] =
    await Promise.all([
      hasLatestPositionAsync(),
      getLatestPositionAsync(),
      // Bounded fetch: 5000 most recent (avoids timeout on large lists)
      getRecentPositionHistoryAsync(5000),
      getPermanentTrackAsync(),
      getLastTrackPositionAsync(),
      getRequestLogAsync(),
    ]);

  // --- 1. Latest position analysis ---
  const positionAgeMs = calculatePositionAgeMs(latestPosition);

  // --- 2. Permanent track analysis (drives the map orange line) ---
  // Sort permanent track by timestamp to find the most recent entry
  const sortedPermanentTrack = [...permanentTrack].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestTrackPoint = sortedPermanentTrack[0] ?? null;
  const latestTrackPointAge = latestTrackPoint
    ? now - new Date(latestTrackPoint.timestamp).getTime()
    : null;

  const gpxTrackPoints = permanentTrack.filter((p) => p.source === "gpx");
  const signalkTrackPoints = permanentTrack.filter((p) => p.source === "signalk");

  // Distance between latest position and last permanent track point
  let distToLastTrackPoint: number | null = null;
  if (latestTrackPoint) {
    distToLastTrackPoint = distanceMeters(
      latestPosition.latitude,
      latestPosition.longitude,
      latestTrackPoint.latitude,
      latestTrackPoint.longitude
    );
  }

  // --- 3. Position history analysis (all SignalK updates, NOT shown on map) ---
  const sortedHistory = [...positionHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestHistoryPoint = sortedHistory[0] ?? null;
  const latestHistoryAge = latestHistoryPoint
    ? now - new Date(latestHistoryPoint.timestamp).getTime()
    : null;

  const signalkHistoryPoints = positionHistory.filter(
    (p) => p.source === "signalk"
  );

  // --- 4. Recent movement analysis ---
  // Check position history for movement in last 24h that didn't make it to permanent track
  const last24h = sortedHistory.filter(
    (p) => now - new Date(p.timestamp).getTime() < 86_400_000
  );
  const last6h = sortedHistory.filter(
    (p) => now - new Date(p.timestamp).getTime() < 6 * 3_600_000
  );
  const last1h = sortedHistory.filter(
    (p) => now - new Date(p.timestamp).getTime() < 3_600_000
  );

  // Calculate total distance covered in recent history (even small moves)
  let recentDistanceCovered = 0;
  let maxRecentDistanceFromAnchor = 0;
  if (last24h.length >= 2) {
    const chronological = [...last24h].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const anchor = chronological[0];
    for (let i = 1; i < chronological.length; i++) {
      recentDistanceCovered += distanceMeters(
        chronological[i - 1].latitude,
        chronological[i - 1].longitude,
        chronological[i].latitude,
        chronological[i].longitude
      );
      const fromAnchor = distanceMeters(
        anchor.latitude,
        anchor.longitude,
        chronological[i].latitude,
        chronological[i].longitude
      );
      maxRecentDistanceFromAnchor = Math.max(maxRecentDistanceFromAnchor, fromAnchor);
    }
  }

  // --- 5. Request log analysis ---
  const recentRequests = requestLog.filter(
    (r) => now - new Date(r.timestamp).getTime() < 3_600_000
  );
  const successfulRequests = requestLog.filter(
    (r) => r.responseStatus === 200
  );
  const failedRequests = requestLog.filter((r) => r.responseStatus !== 200);

  // Last successful position update
  const lastSuccess = requestLog.find((r) => r.responseStatus === 200);
  const lastSuccessAge = lastSuccess
    ? now - new Date(lastSuccess.timestamp).getTime()
    : null;

  // --- 6. Issue detection ---
  const issues: Array<{
    severity: "critical" | "warning" | "info";
    code: string;
    title: string;
    detail: string;
    recommendation: string;
  }> = [];

  // No live data at all
  if (!hasLive || latestPosition.source === "fallback") {
    issues.push({
      severity: "critical",
      code: "NO_LIVE_DATA",
      title: "No live position data received",
      detail:
        "The system is using a fallback position. No SignalK data has been received since the server started.",
      recommendation:
        "Check boat connectivity, Signal K webhook configuration, and SIGNALK_WEBHOOK_SECRET env var.",
    });
  }

  // Position data stale (> 30 min)
  if (hasLive && latestPosition.source === "signalk" && positionAgeMs > 30 * 60_000) {
    issues.push({
      severity: "critical",
      code: "STALE_POSITION",
      title: `Position data is ${formatAge(positionAgeMs)} old`,
      detail: `Last update: ${latestPosition.timestamp}. Expected updates every 1-5 minutes from SignalK webhook.`,
      recommendation:
        "Check boat internet connectivity. Verify msp-webhook/SignalK plugin is running. Check Vercel function logs for incoming requests.",
    });
  }

  // Permanent track not updating despite position updates
  if (
    latestHistoryAge !== null &&
    latestHistoryAge < 3_600_000 &&
    latestTrackPointAge !== null &&
    latestTrackPointAge > 3_600_000
  ) {
    issues.push({
      severity: "warning",
      code: "TRACK_NOT_UPDATING",
      title: "Track line not updating despite receiving position data",
      detail: `Position history has data from ${formatAge(latestHistoryAge)} ago, but permanent track last updated ${formatAge(latestTrackPointAge)} ago. The 200m minimum distance threshold is likely preventing updates.`,
      recommendation:
        "The vessel may be stationary or making small movements (<200m). The track line only updates when the vessel moves >200m from the last recorded track point.",
    });
  }

  // Large gap between latest position and track line end
  if (distToLastTrackPoint !== null && distToLastTrackPoint > 500) {
    issues.push({
      severity: "warning",
      code: "TRACK_GAP",
      title: `Track line ends ${(distToLastTrackPoint / 1000).toFixed(1)}km from current position`,
      detail: `The orange track line on the map ends at ${latestTrackPoint?.latitude.toFixed(5)}, ${latestTrackPoint?.longitude.toFixed(5)} but the vessel is at ${latestPosition.latitude.toFixed(5)}, ${latestPosition.longitude.toFixed(5)}.`,
      recommendation:
        "This gap means recent movement is not captured in the permanent track. Check if positionHistory has intermediate points that should be on the track.",
    });
  }

  // Movement detected but not recorded in track
  if (recentDistanceCovered > 500 && signalkTrackPoints.length === 0) {
    issues.push({
      severity: "warning",
      code: "MOVEMENT_NOT_RECORDED",
      title: `${(recentDistanceCovered / 1000).toFixed(1)}km of recent movement not on track`,
      detail: `Position history shows ${(recentDistanceCovered / 1000).toFixed(1)}km of cumulative movement in the last 24h, but no SignalK points are in the permanent track.`,
      recommendation:
        "The permanent track may only contain GPX imports. SignalK data that exceeds the 200m threshold should be added to the permanent track.",
    });
  }

  // No webhook requests in the log
  if (requestLog.length === 0) {
    issues.push({
      severity: "warning",
      code: "NO_REQUESTS_LOGGED",
      title: "No webhook requests in the log",
      detail:
        "The request log is empty. Either no requests have been received, or the server was recently restarted (in-memory log cleared).",
      recommendation:
        "If using Redis, the request log should persist. If in-memory, send a test position to verify the webhook works.",
    });
  }

  // Auth failures
  if (failedRequests.length > 0 && successfulRequests.length === 0) {
    issues.push({
      severity: "critical",
      code: "ALL_REQUESTS_FAILING",
      title: `All ${failedRequests.length} logged requests failed`,
      detail: `Status codes: ${[...new Set(failedRequests.map((r) => r.responseStatus))].join(", ")}`,
      recommendation:
        "Check SIGNALK_WEBHOOK_SECRET matches between boat and server. Check webhook payload format.",
    });
  }

  // Position history growing but permanent track empty/stale
  if (positionHistory.length > 50 && permanentTrack.length === 0) {
    issues.push({
      severity: "critical",
      code: "EMPTY_PERMANENT_TRACK",
      title: "Permanent track is empty despite position history data",
      detail: `positionHistory has ${positionHistory.length} entries but permanentTrack has 0. The map will show no track line.`,
      recommendation:
        "This suggests a bug in the track recording logic. All position updates should check the 200m distance threshold and add to the permanent track.",
    });
  }

  // No issues found
  if (issues.length === 0) {
    issues.push({
      severity: "info",
      code: "ALL_OK",
      title: "Tracking system appears healthy",
      detail: `Position age: ${formatAge(positionAgeMs)}, Track points: ${permanentTrack.length}, History: ${positionHistory.length}`,
      recommendation: "No action needed.",
    });
  }

  // --- Build response ---
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    storage: isRedisConfigured() ? "redis" : "memory",

    issues,

    latestPosition: {
      source: latestPosition.source,
      latitude: latestPosition.latitude,
      longitude: latestPosition.longitude,
      timestamp: latestPosition.timestamp,
      age: formatAge(positionAgeMs),
      ageMs: positionAgeMs,
      speedOverGround: latestPosition.speedOverGround,
      courseOverGround: latestPosition.courseOverGround,
      hasLiveData: hasLive && latestPosition.source === "signalk",
    },

    permanentTrack: {
      description:
        "Drives the orange track line on the map. Only stores positions >200m apart.",
      totalPoints: permanentTrack.length,
      gpxPoints: gpxTrackPoints.length,
      signalkPoints: signalkTrackPoints.length,
      latestPoint: latestTrackPoint
        ? {
            latitude: latestTrackPoint.latitude,
            longitude: latestTrackPoint.longitude,
            timestamp: latestTrackPoint.timestamp,
            age: formatAge(latestTrackPointAge!),
            source: latestTrackPoint.source,
          }
        : null,
      distanceToCurrentPosition: distToLastTrackPoint
        ? `${distToLastTrackPoint.toFixed(0)}m (${(distToLastTrackPoint / 1000).toFixed(2)}km)`
        : null,
      distanceToCurrentPositionM: distToLastTrackPoint,
      minDistanceThreshold: "200m",
    },

    lastTrackPositionRef: {
      description:
        "The reference point used for the 200m threshold. New positions are compared against this. Set by both SignalK updates and GPX imports.",
      value: lastTrackPos
        ? {
            latitude: lastTrackPos.latitude,
            longitude: lastTrackPos.longitude,
            timestamp: lastTrackPos.timestamp,
            source: lastTrackPos.source,
            distanceToCurrentPosition: distanceMeters(
              lastTrackPos.latitude,
              lastTrackPos.longitude,
              latestPosition.latitude,
              latestPosition.longitude
            ).toFixed(0) + "m",
          }
        : null,
    },

    positionHistory: {
      description:
        "All received SignalK updates (NOT shown on map). Shows whether data is arriving.",
      totalPoints: positionHistory.length,
      signalkPoints: signalkHistoryPoints.length,
      latestPoint: latestHistoryPoint
        ? {
            latitude: latestHistoryPoint.latitude,
            longitude: latestHistoryPoint.longitude,
            timestamp: latestHistoryPoint.timestamp,
            age: formatAge(latestHistoryAge!),
            source: latestHistoryPoint.source,
          }
        : null,
    },

    recentActivity: {
      positionsLast1h: last1h.length,
      positionsLast6h: last6h.length,
      positionsLast24h: last24h.length,
      cumulativeDistanceLast24h: `${(recentDistanceCovered / 1000).toFixed(2)}km`,
      maxDistanceFromAnchor: `${maxRecentDistanceFromAnchor.toFixed(0)}m`,
    },

    webhookStatus: {
      totalRequestsLogged: requestLog.length,
      recentRequestsLast1h: recentRequests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      lastSuccessfulRequest: lastSuccess
        ? {
            timestamp: lastSuccess.timestamp,
            age: formatAge(lastSuccessAge!),
            format: lastSuccess.payloadFormat,
            authMethod: (lastSuccess as { authMethod?: string }).authMethod,
          }
        : null,
    },

    // Recent positionHistory entries that are NOT in permanentTrack
    // These represent "lost" movements that didn't meet the 200m threshold
    recentUnrecordedPositions: (() => {
      const trackTimestamps = new Set(permanentTrack.map((p) => p.timestamp));
      return last6h
        .filter((p) => !trackTimestamps.has(p.timestamp))
        .slice(0, 20)
        .map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          timestamp: p.timestamp,
          age: formatAge(now - new Date(p.timestamp).getTime()),
          source: p.source,
          speedOverGround: p.speedOverGround,
        }));
    })(),
  });
}
