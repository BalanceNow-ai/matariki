"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type SignalKPosition = {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  source: "signalk" | "fallback";
  courseOverGround?: number;
  speedOverGround?: number;
  heading?: number;
  name?: string;
  mmsi?: string;
  location?: string;
};

type UseSignalKOptions = {
  /** Polling interval in milliseconds (default: 60000 = 1 minute) */
  pollInterval?: number;
  /** Whether to start polling immediately (default: true) */
  autoStart?: boolean;
};

/**
 * Hook to fetch the latest position from Signal K via the /api/position endpoint
 *
 * @example
 * const { position, isLoading, error, refetch } = useSignalK();
 *
 * return (
 *   <div>
 *     {position && (
 *       <span>Lat: {position.latitude}, Lng: {position.longitude}</span>
 *     )}
 *   </div>
 * );
 */
export function useSignalK(options: UseSignalKOptions = {}) {
  const { pollInterval = 60000, autoStart = true } = options;

  const [position, setPosition] = useState<SignalKPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchPosition = useCallback(async () => {
    try {
      const response = await fetch("/api/position", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SignalKPosition = await response.json();

      if (isMountedRef.current) {
        setPosition(data);
        setLastUpdated(new Date());
        setError(null);
        setIsLoading(false);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch position";

      if (isMountedRef.current) {
        setError(errorMessage);
        setIsLoading(false);
      }

      console.error("[SignalK] Fetch error:", errorMessage);
      return null;
    }
  }, []);

  const startPolling = useCallback(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Fetch immediately
    fetchPosition();

    // Start polling
    intervalRef.current = setInterval(fetchPosition, pollInterval);
  }, [fetchPosition, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (autoStart) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [autoStart, startPolling, stopPolling]);

  return {
    position,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchPosition,
    startPolling,
    stopPolling,
  };
}

/**
 * Convert speed from m/s to knots
 */
export function toKnots(speedMs: number | undefined): number | undefined {
  if (speedMs === undefined) return undefined;
  return speedMs * 1.94384;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";

  const formatDegrees = (value: number): string => {
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = (abs - degrees) * 60;
    return `${degrees}° ${minutes.toFixed(3)}'`;
  };

  return `${formatDegrees(lat)} ${latDir}, ${formatDegrees(lng)} ${lngDir}`;
}

/**
 * Calculate time since last update
 */
export function timeSince(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
