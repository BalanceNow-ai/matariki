"use client";

import { SignalKPosition } from "@/app/api/position/store";

type WeatherConditionsPanelProps = {
  position: SignalKPosition | null;
  className?: string;
};

// Estimate sea state based on wind speed (Beaufort scale approximation)
function getSeaState(windSpeedKts?: number): { state: string; description: string } {
  if (windSpeedKts === undefined) return { state: "--", description: "Unknown" };

  if (windSpeedKts < 1) return { state: "0", description: "Calm, glassy" };
  if (windSpeedKts < 4) return { state: "1", description: "Calm, rippled" };
  if (windSpeedKts < 7) return { state: "2", description: "Smooth wavelets" };
  if (windSpeedKts < 11) return { state: "3", description: "Slight seas" };
  if (windSpeedKts < 17) return { state: "4", description: "Moderate seas" };
  if (windSpeedKts < 22) return { state: "5", description: "Rough seas" };
  if (windSpeedKts < 28) return { state: "6", description: "Very rough" };
  if (windSpeedKts < 34) return { state: "7", description: "High seas" };
  return { state: "8+", description: "Very high seas" };
}

// Get wind direction name
function getWindDirectionName(angle?: number): string {
  if (angle === undefined) return "--";

  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(angle / 22.5) % 16;
  return directions[index];
}

// Wind compass component
function WindCompass({
  apparentAngle,
  heading,
}: {
  apparentAngle?: number;
  heading?: number;
}) {
  // Calculate true wind direction (relative to north)
  // Note: This is simplified - true wind calculation would need boat speed
  const trueWindDirection =
    heading !== undefined && apparentAngle !== undefined
      ? (heading + apparentAngle) % 360
      : undefined;

  return (
    <div className="relative w-24 h-24">
      {/* Compass ring */}
      <div className="absolute inset-0 rounded-full border-2 border-mist/30" />

      {/* Cardinal directions */}
      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 text-xs font-mono text-mist/70">
        N
      </span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 text-xs font-mono text-mist/70">
        S
      </span>
      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 text-xs font-mono text-mist/70">
        W
      </span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5 text-xs font-mono text-mist/70">
        E
      </span>

      {/* Boat heading indicator (center) */}
      {heading !== undefined && (
        <div
          className="absolute inset-4 flex items-center justify-center"
          style={{ transform: `rotate(${heading}deg)` }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-copper-accent"
          >
            <path
              d="M12 2L8 18L12 16L16 18L12 2Z"
              fill="currentColor"
              opacity="0.5"
            />
          </svg>
        </div>
      )}

      {/* True wind direction arrow */}
      {trueWindDirection !== undefined && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${trueWindDirection}deg)` }}
        >
          <div className="w-full h-full flex flex-col items-center">
            <svg
              width="16"
              height="48"
              viewBox="0 0 16 48"
              fill="none"
              className="text-sea-green"
            >
              <path d="M8 0L4 12H12L8 0Z" fill="currentColor" />
              <line
                x1="8"
                y1="12"
                x2="8"
                y2="40"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-mist/50" />
    </div>
  );
}

export function WeatherConditionsPanel({
  position,
  className = "",
}: WeatherConditionsPanelProps) {
  const seaState = getSeaState(position?.apparentWindSpeed);
  const windDirection = getWindDirectionName(
    position?.heading !== undefined && position?.apparentWindAngle !== undefined
      ? (position.heading + position.apparentWindAngle) % 360
      : undefined
  );

  return (
    <div
      className={`bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-copper-accent uppercase tracking-wider font-mono">
          Weather & Conditions
        </span>
      </div>

      <div className="flex items-start gap-4">
        {/* Wind Compass */}
        <div className="flex flex-col items-center">
          <WindCompass
            apparentAngle={position?.apparentWindAngle}
            heading={position?.heading}
          />
          <span className="text-xs text-mist/60 mt-2">Wind from {windDirection}</span>
        </div>

        {/* Weather Data */}
        <div className="flex-1 space-y-3">
          {/* Wind */}
          <div>
            <div className="text-xs text-mist/60 uppercase tracking-wider mb-1">
              Wind
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-salt-white">
                {position?.apparentWindSpeed?.toFixed(0) ?? "--"}
              </span>
              <span className="text-sm text-mist/80">kts</span>
              {position?.apparentWindAngle !== undefined && (
                <span className="text-sm text-mist/60 ml-2">
                  {position.apparentWindAngle > 0 ? "+" : ""}
                  {position.apparentWindAngle.toFixed(0)}° apparent
                </span>
              )}
            </div>
          </div>

          {/* Sea State */}
          <div className="border-t border-mist/10 pt-3">
            <div className="text-xs text-mist/60 uppercase tracking-wider mb-1">
              Sea State
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-mono font-bold text-salt-white">
                {seaState.state}
              </span>
              <span className="text-sm text-mist/80">{seaState.description}</span>
            </div>
          </div>

          {/* Atmospheric */}
          <div className="border-t border-mist/10 pt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-mist/60 uppercase tracking-wider mb-0.5">
                Pressure
              </div>
              <div className="font-mono text-salt-white">
                {position?.barometricPressure?.toFixed(0) ?? "--"}
                <span className="text-xs text-mist/80 ml-1">hPa</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-mist/60 uppercase tracking-wider mb-0.5">
                Water Temp
              </div>
              <div className="font-mono text-salt-white">
                {position?.waterTemperature?.toFixed(1) ?? "--"}
                <span className="text-xs text-mist/80 ml-1">°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
