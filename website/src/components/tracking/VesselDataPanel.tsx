"use client";

import { useEffect, useState } from "react";
import { SignalKPosition } from "@/app/api/position/store";

/** Shape returned by /api/position/status. */
export type TrackingStatus = {
  condition: "ok" | "no-gps-fix" | "no-contact" | "never-reported";
  summary: string;
  lastFixAt: string | null;
  lastFixAgeMs: number;
  lastContactAt: string | null;
  lastContactAgeMs: number | null;
};

type VesselDataPanelProps = {
  position: SignalKPosition | null;
  isLoading?: boolean;
  lastUpdated?: Date | null;
  /** Why the position may not be current — distinguishes silence from no fix. */
  trackingStatus?: TrackingStatus | null;
  className?: string;
};

// Wind direction indicator component
function WindIndicator({ angle }: { angle: number }) {
  // Convert apparent wind angle to rotation
  // 0° = bow, positive = starboard, negative = port
  const rotation = angle;

  return (
    <div className="relative w-16 h-16">
      {/* Boat outline */}
      <div className="absolute inset-0 rounded-full border-2 border-mist/30" />

      {/* Cardinal points */}
      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xs text-mist/50">
        BOW
      </span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-xs text-mist/50">
        STERN
      </span>

      {/* Wind arrow */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          className="text-sea-green"
        >
          <path
            d="M20 4L24 16H16L20 4Z"
            fill="currentColor"
          />
          <line
            x1="20"
            y1="16"
            x2="20"
            y2="32"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

// Single data item display
function DataItem({
  label,
  value,
  unit,
  size = "normal",
}: {
  label: string;
  value: string | number | undefined;
  unit?: string;
  size?: "normal" | "large";
}) {
  const displayValue = value !== undefined ? value : "--";

  return (
    <div className="flex flex-col">
      <span className="text-xs text-mist/60 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`font-mono font-semibold text-salt-white ${
          size === "large" ? "text-2xl" : "text-lg"
        }`}
      >
        {displayValue}
        {unit && value !== undefined && (
          <span className="text-sm text-mist/80 ml-1">{unit}</span>
        )}
      </span>
    </div>
  );
}

// Age of a position, in words
function formatAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Past this, a fix is history, not a live position. */
const LIVE_THRESHOLD_MS = 30 * 60_000;

export function VesselDataPanel({
  position,
  isLoading = false,
  lastUpdated,
  trackingStatus,
  className = "",
}: VesselDataPanelProps) {
  // A ticking clock rather than Date.now() during render: the age must keep
  // counting up between polls, and reading the clock while rendering would
  // give the server and the client different answers.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Deferred rather than set synchronously here, so the first paint matches
    // what the server rendered and React is not asked to re-render mid-effect.
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  // Age of the fix itself, not of our last poll. These were conflated before,
  // so the panel read "LIVE / Just now" throughout a 45-day tracking outage
  // simply because the browser had successfully fetched a stale position.
  const fixAgeMs =
    now !== null && position?.timestamp
      ? now - new Date(position.timestamp).getTime()
      : null;

  const isLive =
    position?.source === "signalk" &&
    fixAgeMs !== null &&
    fixAgeMs >= 0 &&
    fixAgeMs < LIVE_THRESHOLD_MS;

  const staleNotice =
    !isLive && !isLoading && position
      ? trackingStatus?.summary ??
        (fixAgeMs !== null
          ? `Last position ${formatAgo(fixAgeMs)}`
          : "Position age unknown")
      : null;

  return (
    <div
      className={`bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-display text-salt-white">
            Matariki III
          </h3>
          {isLive ? (
            <span className="flex items-center gap-1 text-xs text-sea-green">
              <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
              LIVE
            </span>
          ) : (
            !isLoading &&
            position && (
              <span className="flex items-center gap-1 text-xs text-copper-accent">
                <span className="w-2 h-2 bg-copper-accent rounded-full" />
                {trackingStatus?.condition === "no-gps-fix" ? "NO GPS FIX" : "DELAYED"}
              </span>
            )
          )}
        </div>
        {fixAgeMs !== null && (
          <span className="text-xs text-mist/60">{formatAgo(fixAgeMs)}</span>
        )}
      </div>

      {/* Say plainly why the position is not current, rather than showing an
          old fix as though it were live. */}
      {staleNotice && (
        <p className="mb-4 text-xs leading-relaxed text-copper-accent/90 bg-copper-accent/10 border border-copper-accent/20 rounded-lg px-3 py-2">
          {staleNotice}
        </p>
      )}

      {lastUpdated && now !== null && (
        <p className="sr-only">
          Data last checked {formatAgo(now - lastUpdated.getTime())}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-mist/30 border-t-copper-accent" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Primary Navigation Data */}
          <div className="grid grid-cols-3 gap-4">
            <DataItem
              label="SOG"
              value={position?.speedOverGround?.toFixed(1)}
              unit="kts"
              size="large"
            />
            <DataItem
              label="Heading"
              value={position?.heading?.toFixed(0)}
              unit="°"
              size="large"
            />
            <DataItem
              label="Depth"
              value={position?.depth?.toFixed(1)}
              unit="m"
              size="large"
            />
          </div>

          {/* Wind Data with Indicator */}
          <div className="border-t border-mist/10 pt-4">
            <div className="flex items-center gap-4">
              {position?.apparentWindAngle !== undefined && (
                <WindIndicator angle={position.apparentWindAngle} />
              )}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <DataItem
                  label="Wind Speed"
                  value={position?.apparentWindSpeed?.toFixed(1)}
                  unit="kts"
                />
                <DataItem
                  label="Wind Angle"
                  value={position?.apparentWindAngle?.toFixed(0)}
                  unit="°"
                />
              </div>
            </div>
          </div>

          {/* Environment Data */}
          <div className="border-t border-mist/10 pt-4 grid grid-cols-3 gap-4">
            <DataItem
              label="Water Temp"
              value={position?.waterTemperature?.toFixed(1)}
              unit="°C"
            />
            <DataItem
              label="Pressure"
              value={position?.barometricPressure?.toFixed(0)}
              unit="hPa"
            />
            <DataItem
              label="Trip Log"
              value={position?.tripLog?.toFixed(1)}
              unit="nm"
            />
          </div>

          {/* Position */}
          <div className="border-t border-mist/10 pt-4">
            <div className="text-xs text-mist/60 uppercase tracking-wider mb-1">
              Position
            </div>
            <div className="font-mono text-sm text-salt-white">
              {position ? (
                <>
                  {Math.abs(position.latitude).toFixed(5)}°
                  {position.latitude >= 0 ? "N" : "S"},{" "}
                  {Math.abs(position.longitude).toFixed(5)}°
                  {position.longitude >= 0 ? "E" : "W"}
                </>
              ) : (
                "--"
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
