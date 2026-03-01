/**
 * Shared position storage module
 * Used by position API routes for in-memory position data
 */

export type SignalKPosition = {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  timezone?: string; // IANA timezone name (e.g., "Pacific/Auckland")
  source: "signalk" | "fallback";
  // Navigation data from Signal K
  courseOverGround?: number; // degrees
  speedOverGround?: number; // knots
  heading?: number; // degrees (true heading)
  tripLog?: number; // nautical miles
  depth?: number; // meters
  // Wind data
  apparentWindSpeed?: number; // knots
  apparentWindAngle?: number; // degrees
  // Environment data
  waterTemperature?: number; // celsius
  barometricPressure?: number; // hPa
  // Vessel info
  name?: string;
  mmsi?: string;
  location?: string;
};

// Request log entry for debugging
export type RequestLogEntry = {
  id: string;
  timestamp: string;
  method: string;
  authStatus: "success" | "failed" | "no-secret";
  authMethod?: string;
  tokenPreview?: string;
  receivedAuthHeaders?: Record<string, string | null>;
  payloadFormat: "signalk-delta" | "simplified" | "nested-position" | "invalid" | "unknown";
  payloadSize: number;
  rawPayload: unknown;
  parsedPosition?: Partial<SignalKPosition>;
  responseStatus: number;
  responseBody: unknown;
  processingTimeMs: number;
  error?: string;
};

// In-memory stores
let latestPosition: SignalKPosition | null = null;
const positionHistory: SignalKPosition[] = [];
const MAX_HISTORY_SIZE = 1000;

// Request log for debugging
const requestLog: RequestLogEntry[] = [];
const MAX_REQUEST_LOG_SIZE = 50;

// Fallback position (Whangarei Marina)
const FALLBACK_POSITION: SignalKPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  timestamp: new Date().toISOString(),
  source: "fallback",
  name: "Matariki III",
  location: "Whangarei, New Zealand",
};

export function getLatestPosition(): SignalKPosition {
  return latestPosition || FALLBACK_POSITION;
}

export function setLatestPosition(position: SignalKPosition): void {
  latestPosition = position;

  // Add to history
  positionHistory.unshift({ ...position });
  if (positionHistory.length > MAX_HISTORY_SIZE) {
    positionHistory.pop();
  }
}

export function getPositionHistory(): SignalKPosition[] {
  return [...positionHistory];
}

export function hasLatestPosition(): boolean {
  return latestPosition !== null;
}

// Request log functions
export function addRequestLog(entry: RequestLogEntry): void {
  requestLog.unshift(entry);
  if (requestLog.length > MAX_REQUEST_LOG_SIZE) {
    requestLog.pop();
  }
}

export function getRequestLog(): RequestLogEntry[] {
  return [...requestLog];
}

export function clearRequestLog(): void {
  requestLog.length = 0;
}

/**
 * Calculate the age (in milliseconds) of a position by parsing its local timestamp
 * with the stored timezone information.
 *
 * The position.timestamp is stored as a local time string (e.g., "2026-03-02 12:33:11")
 * in the position.timezone (e.g., "Pacific/Auckland"). We need to properly interpret
 * this to get the correct UTC time for age calculation.
 *
 * @param position - The position object with timestamp and timezone
 * @returns Age in milliseconds (positive = in the past, negative = in the future)
 */
/**
 * Parse a local timestamp with its timezone and return a UTC Date object.
 * This is useful for comparing timestamps or doing date arithmetic.
 *
 * @param timestamp - Local time string (e.g., "2026-03-02 12:33:11")
 * @param timezone - IANA timezone name (e.g., "Pacific/Auckland")
 * @returns Date object representing the UTC time
 */
export function parseLocalTimestampToUtc(
  timestamp: string,
  timezone: string | undefined
): Date {
  // If no timezone, fall back to basic parsing
  if (!timezone) {
    return new Date(timestamp);
  }

  // Parse the local timestamp string: "2026-03-02 12:33:11"
  const match = timestamp.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    return new Date(timestamp);
  }

  const [, year, month, day, hour, minute, second] = match;

  // Create a formatter that outputs in ISO format for the given timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "longOffset", // e.g., "GMT+13:00"
  });

  // Create a reference date using the parsed components as UTC
  const refDateUtc = new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    )
  );

  // Get the timezone offset at this time
  const parts = formatter.formatToParts(refDateUtc);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  const offsetStr = offsetPart?.value || "GMT+00:00";

  // Parse offset like "GMT+13:00" or "GMT-05:00"
  const offsetMatch = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === "+" ? 1 : -1;
    const hours = parseInt(offsetMatch[2]) || 0;
    const mins = parseInt(offsetMatch[3]) || 0;
    offsetMinutes = sign * (hours * 60 + mins);
  }

  // Convert local time to UTC: UTC = LocalTime - Offset
  const actualUtcMs = refDateUtc.getTime() - offsetMinutes * 60 * 1000;

  return new Date(actualUtcMs);
}

export function calculatePositionAgeMs(position: SignalKPosition): number {
  const utcDate = parseLocalTimestampToUtc(position.timestamp, position.timezone);
  return Date.now() - utcDate.getTime();
}
