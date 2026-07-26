"use client";

import { useState, useEffect, useCallback } from "react";
import { OpenSeaMap, VesselPosition, LogEntryWaypoint } from "@/components/map/OpenSeaMap";
import { VesselDataPanel, type TrackingStatus } from "./VesselDataPanel";
import { VoyageContextPanel, Voyage } from "./VoyageContextPanel";
import { WeatherConditionsPanel } from "./WeatherConditionsPanel";
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
  activeVoyage?: Voyage | null;
  allVoyages?: Voyage[];
  waypoints?: LogEntryWaypoint[];
};

export function LiveTracker({
  fallback,
  activeVoyage = null,
  allVoyages = [],
  waypoints = [],
}: LiveTrackerProps) {
  const [position, setPosition] = useState<SignalKPosition | null>(null);
  const [trackHistory, setTrackHistory] = useState<VesselPosition[]>([]);
  const [showTrack, setShowTrack] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [selectedVoyageId, setSelectedVoyageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);

  // Filter waypoints by selected voyage
  const filteredWaypoints = selectedVoyageId
    ? waypoints.filter((wp) => wp.voyageTitle === allVoyages.find((v) => v._id === selectedVoyageId)?.title)
    : waypoints;

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

  // Fetch tracking status: whether the boat is in contact, and whether it has
  // a fix. Without this the UI cannot tell a silent vessel from one that is
  // transmitting with no GPS.
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/position/status", { cache: "no-store" });
      if (!response.ok) return;
      setTrackingStatus(await response.json());
    } catch (err) {
      console.error("Failed to fetch tracking status:", err);
    }
  }, []);

  // Fetch track history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/position/track?type=history", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();

      const points: SignalKPosition[] = data.positionHistory?.points || [];

      // Chronological, matching the server. Sorting by segment first placed
      // every imported GPX point ahead of every live one regardless of when it
      // was recorded, which drew the track back and forth in time.
      points.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
        const segA = a.segmentIndex ?? 0;
        const segB = b.segmentIndex ?? 0;
        if (segA !== segB) return segA - segB;
        return (a.pointIndex ?? 0) - (b.pointIndex ?? 0);
      });

      const mappedHistory = points.map((p: SignalKPosition) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
        heading: p.heading,
        courseOverGround: p.courseOverGround,
        speedOverGround: p.speedOverGround,
        segmentIndex: p.segmentIndex,
        name: p.name,
      }));

      setTrackHistory(mappedHistory);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    fetchPosition();
    fetchStatus();
    fetchHistory();

    // Poll for updates every 60 seconds
    const positionInterval = setInterval(() => {
      fetchPosition();
      fetchStatus();
    }, 60000);
    // Refresh history every 5 minutes
    const historyInterval = setInterval(fetchHistory, 300000);

    return () => {
      clearInterval(positionInterval);
      clearInterval(historyInterval);
    };
  }, [fetchPosition, fetchStatus, fetchHistory]);

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
      <div className="flex-1 relative min-h-[50vh] lg:min-h-0 isolate z-0">
        <div className="absolute inset-0">
          <OpenSeaMap
            position={mapPosition}
            trackHistory={trackHistory}
            waypoints={filteredWaypoints}
            showTrack={showTrack}
            showWaypoints={showWaypoints}
            zoom={11}
          />
        </div>
      </div>

      {/* Data Panel - Sidebar */}
      <div className="lg:w-80 xl:w-96 bg-midnight-blue/50 p-4 space-y-4 overflow-y-auto">
        {/* Voyage Context */}
        {(activeVoyage || allVoyages.length > 0) && (
          <VoyageContextPanel
            activeVoyage={activeVoyage}
            allVoyages={allVoyages}
            onVoyageChange={setSelectedVoyageId}
            distanceStats={{
              totalNm: position?.tripLog ?? 0,
              voyageNm: position?.tripLog ?? 0,
            }}
          />
        )}

        {/* Vessel Data */}
        {/* The error state was previously recorded but never rendered, so a
            failing fetch looked identical to everything working. */}
        {error && (
          <div
            role="status"
            className="bg-deep-ocean/95 border border-copper-accent/40 rounded-xl p-4 text-sm text-copper-accent"
          >
            {error}. Showing the last position received.
          </div>
        )}

        <VesselDataPanel
          position={position}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          trackingStatus={trackingStatus}
        />

        {/* Weather & Conditions */}
        <WeatherConditionsPanel position={position} />

        {/* Map Display Options */}
        <div className="bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl p-4 space-y-3">
          <h4 className="text-xs text-copper-accent uppercase tracking-wider font-mono mb-2">
            Map Options
          </h4>

          {/* Track History Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-salt-white">
                Track History
              </span>
              <p className="text-xs text-mist/60">
                {trackHistory.length} positions
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

          {/* Waypoints Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-mist/10">
            <div>
              <span className="text-sm font-medium text-salt-white">
                Log Entry Waypoints
              </span>
              <p className="text-xs text-mist/60">
                {filteredWaypoints.length} locations
              </p>
            </div>
            <button
              onClick={() => setShowWaypoints(!showWaypoints)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                showWaypoints ? "bg-copper-accent" : "bg-mist/30"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showWaypoints ? "left-7" : "left-1"
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
