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

// In-memory stores
let latestPosition: SignalKPosition | null = null;
const positionHistory: SignalKPosition[] = [];
const MAX_HISTORY_SIZE = 1000;

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
