/**
 * Shared assessment of how tracking is actually doing.
 *
 * Lives outside the route files so both the health endpoint and the cron
 * monitor apply exactly the same thresholds and wording.
 */

/** Beyond this, a position is old enough that the map must not claim it is live. */
export const FIX_STALE_MS = 30 * 60_000;
/** Beyond this without any webhook at all, we have lost contact with the boat. */
export const CONTACT_STALE_MS = 30 * 60_000;

export type TrackingCondition =
  | "ok"
  | "no-gps-fix"
  | "no-contact"
  | "never-reported";

export function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

/**
 * Separate "is the boat talking to us" from "does the boat know where it is".
 *
 * Collapsing the two hid a real failure: the transmitter can be reporting
 * every minute, authenticating correctly, while every payload carries a null
 * position because the GPS has no fix. Reported as a single staleness number
 * that looks identical to the vessel having gone silent, which is a different
 * problem with a different remedy.
 */
export function assessTracking(input: {
  now: number;
  lastContactAt: string | null;
  lastFixAt: string | null;
  fixAgeMs: number;
  hasLiveFix: boolean;
}): { condition: TrackingCondition; summary: string } {
  const { now, lastContactAt, fixAgeMs, hasLiveFix } = input;

  if (!lastContactAt) {
    return {
      condition: "never-reported",
      summary: "No webhook has ever been received from the vessel",
    };
  }

  const contactAgeMs = now - new Date(lastContactAt).getTime();

  if (contactAgeMs > CONTACT_STALE_MS) {
    return {
      condition: "no-contact",
      summary: `No contact from the vessel for ${formatAge(contactAgeMs)}`,
    };
  }

  if (!hasLiveFix || fixAgeMs > FIX_STALE_MS) {
    return {
      condition: "no-gps-fix",
      summary:
        `Vessel is transmitting (last contact ${formatAge(contactAgeMs)} ago) ` +
        `but has reported no GPS fix for ${formatAge(fixAgeMs)}`,
    };
  }

  return {
    condition: "ok",
    summary: `Tracking normally, last fix ${formatAge(fixAgeMs)} ago`,
  };
}

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
