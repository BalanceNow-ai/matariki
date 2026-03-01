/**
 * Shared position storage module
 * Used by position API routes for in-memory position data
 */

export type SignalKPosition = {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
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
