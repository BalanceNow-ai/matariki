"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { OpenSeaMap, VesselPosition } from "@/components/map/OpenSeaMap";
import { SignalKPosition } from "@/app/api/position/store";

// Fallback center position for the map
const FALLBACK_CENTER = {
  lat: -36.428167,
  lng: 174.819036,
};

interface MapWidgetProps {
  className?: string;
}

export function MapWidget({ className }: MapWidgetProps) {
  const [position, setPosition] = useState<SignalKPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current position
  const fetchPosition = useCallback(async () => {
    try {
      const response = await fetch("/api/position", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: SignalKPosition = await response.json();
      setPosition(data);
    } catch (err) {
      console.error("Failed to fetch position:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    fetchPosition();
    // Poll for updates every 60 seconds
    const interval = setInterval(fetchPosition, 60000);
    return () => clearInterval(interval);
  }, [fetchPosition]);

  // Convert to map position format
  const mapPosition: VesselPosition = position
    ? {
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: position.timestamp,
        heading: position.heading,
        courseOverGround: position.courseOverGround,
        speedOverGround: position.speedOverGround,
      }
    : {
        latitude: FALLBACK_CENTER.lat,
        longitude: FALLBACK_CENTER.lng,
        timestamp: new Date().toISOString(),
      };

  const isLive = position?.source === "signalk";

  return (
    <div className={`bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl shadow-2xl overflow-hidden ${className || ''}`}>
      {/* OpenSeaMap Live Map */}
      <div className="aspect-[4/3] bg-slate-water relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-mist/30 border-t-copper-accent" />
          </div>
        ) : (
          <OpenSeaMap
            position={mapPosition}
            zoom={11}
            className="w-full h-full"
          />
        )}
      </div>

      {/* Info panel */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-sea-green animate-pulse' : 'bg-copper-accent'}`} />
            <span className={`text-xs font-medium uppercase tracking-wider ${isLive ? 'text-sea-green' : 'text-copper-accent'}`}>
              {isLive ? 'Live' : 'Last Known'}
            </span>
          </div>
          <span className="text-xs text-storm-grey">
            via SignalK
          </span>
        </div>

        <div>
          <div className="text-lg text-salt-white font-display">Matariki III</div>
          {position?.speedOverGround !== undefined && (
            <div className="text-sm text-mist">
              {position.speedOverGround.toFixed(1)} kts
              {position.heading !== undefined && ` · ${Math.round(position.heading)}°`}
            </div>
          )}
        </div>

        <Link
          href="/track"
          className="block text-center py-2.5 text-sm text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider border-t border-mist/10 -mx-4 px-4 mt-3 pt-3 hover:bg-midnight-blue/30"
        >
          View Full Track →
        </Link>
      </div>
    </div>
  );
}
