"use client";

import { useState, useEffect, useCallback } from "react";
import { OpenSeaMap, VesselPosition } from "@/components/map/OpenSeaMap";
import { VesselDataPanel } from "./VesselDataPanel";
import { SignalKPosition } from "@/app/api/position/store";

type FallbackPosition = {
  lat: number;
  lng: number;
  location: string;
  region: string;
  updated: string;
};

type LiveTrackerProps = {
  fallback: FallbackPosition;
};

export function LiveTracker({ fallback }: LiveTrackerProps) {
  const [position, setPosition] = useState<SignalKPosition | null>(null);
  const [trackHistory, setTrackHistory] = useState<VesselPosition[]>([]);
  const [showTrack, setShowTrack] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current position
  const fetchPosition = useCallback(async () => {
    try {
      const response = await fetch("/api/position", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: SignalKPosition = await response.json();
      setPosition(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch position:", err);
      setError("Unable to fetch position");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch track history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/position/history?limit=200", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      setTrackHistory(
        data.positions.map((p: SignalKPosition) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          timestamp: p.timestamp,
          heading: p.heading,
          courseOverGround: p.courseOverGround,
          speedOverGround: p.speedOverGround,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    fetchPosition();
    fetchHistory();

    // Poll for updates every 60 seconds
    const positionInterval = setInterval(fetchPosition, 60000);
    // Refresh history every 5 minutes
    const historyInterval = setInterval(fetchHistory, 300000);

    return () => {
      clearInterval(positionInterval);
      clearInterval(historyInterval);
    };
  }, [fetchPosition, fetchHistory]);

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
        latitude: fallback.lat,
        longitude: fallback.lng,
        timestamp: new Date().toISOString(),
      };

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Map Area */}
      <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
        <div className="absolute inset-0">
          <OpenSeaMap
            position={mapPosition}
            trackHistory={trackHistory}
            showTrack={showTrack}
            zoom={11}
          />
        </div>
      </div>

      {/* Data Panel - Sidebar */}
      <div className="lg:w-80 xl:w-96 bg-midnight-blue/50 p-4 space-y-4 overflow-y-auto">
        {/* Vessel Data */}
        <VesselDataPanel
          position={position}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
        />

        {/* Track History Toggle */}
        <div className="bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-salt-white">
                Show Track History
              </h4>
              <p className="text-xs text-mist/60">
                {trackHistory.length} positions recorded
              </p>
            </div>
            <button
              onClick={() => setShowTrack(!showTrack)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                showTrack ? "bg-copper-accent" : "bg-mist/30"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showTrack ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Source Attribution */}
        <div className="text-center text-xs text-mist/40 pt-2">
          <p>Chart data: OpenStreetMap + OpenSeaMap</p>
          <p>Vessel data: SignalK via Morvargh Webhook</p>
        </div>
      </div>
    </div>
  );
}
