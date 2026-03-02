"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OpenSeaMap, VesselPosition, LogEntryWaypoint } from "@/components/map/OpenSeaMap";
import { VesselDataPanel } from "./VesselDataPanel";
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
  const [isClearing, setIsClearing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [trackMessage, setTrackMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter waypoints by selected voyage
  const filteredWaypoints = selectedVoyageId
    ? waypoints.filter((wp) => wp.voyageTitle === allVoyages.find((v) => v._id === selectedVoyageId)?.title)
    : waypoints;

  // Check admin access on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem("adminToken");
    if (storedToken) {
      // Verify the stored token is still valid
      fetch("/api/admin/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: storedToken }),
      })
        .then((res) => {
          if (res.ok) {
            setIsAdmin(true);
            setAdminToken(storedToken);
          } else {
            sessionStorage.removeItem("adminToken");
          }
        })
        .catch(() => sessionStorage.removeItem("adminToken"));
    }
  }, []);

  // Prompt for admin token
  const promptAdminToken = useCallback(async () => {
    const token = prompt("Enter admin token to manage track:");
    if (!token) return false;

    try {
      const res = await fetch("/api/admin/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setIsAdmin(true);
        setAdminToken(token);
        sessionStorage.setItem("adminToken", token);
        return true;
      } else {
        setTrackMessage("Error: Invalid admin token");
        return false;
      }
    } catch {
      setTrackMessage("Error: Failed to verify token");
      return false;
    }
  }, []);

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

  // Clear track history
  const handleClearTrack = useCallback(async () => {
    // Check if admin or prompt for token
    let token = adminToken;
    if (!isAdmin) {
      const authorized = await promptAdminToken();
      if (!authorized) return;
      token = sessionStorage.getItem("adminToken");
    }

    if (!confirm("Clear all track history? This cannot be undone.")) return;

    setIsClearing(true);
    setTrackMessage(null);
    try {
      const response = await fetch("/api/position/clear", {
        method: "POST",
        headers: token ? { "X-API-Key": token } : {},
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok) {
        setTrackHistory([]);
        setTrackMessage(`Cleared ${data.cleared} positions`);
        setTimeout(() => setTrackMessage(null), 3000);
      } else {
        setTrackMessage(`Error: ${data.error || "Failed to clear"}`);
      }
    } catch (err) {
      console.error("Failed to clear track:", err);
      setTrackMessage("Error: Failed to clear track");
    } finally {
      setIsClearing(false);
    }
  }, [isAdmin, adminToken, promptAdminToken]);

  // Handle GPX file upload
  const handleGPXUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if admin or prompt for token
    let token = adminToken;
    if (!isAdmin) {
      const authorized = await promptAdminToken();
      if (!authorized) {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      token = sessionStorage.getItem("adminToken");
    }

    setIsUploading(true);
    setTrackMessage(null);
    try {
      const formData = new FormData();
      formData.append("gpx", file);

      const response = await fetch("/api/position/import-gpx", {
        method: "POST",
        headers: token ? { "X-API-Key": token } : {},
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setTrackMessage(`Imported ${data.imported} waypoints`);
        // Refresh track history
        await fetchHistory();
        setTimeout(() => setTrackMessage(null), 3000);
      } else {
        setTrackMessage(`Error: ${data.error || "Failed to import"}`);
      }
    } catch (err) {
      console.error("Failed to upload GPX:", err);
      setTrackMessage("Error: Failed to upload GPX");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [fetchHistory, isAdmin, adminToken, promptAdminToken]);

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
        <VesselDataPanel
          position={position}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
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

          {/* Track Management */}
          <div className="pt-2 border-t border-mist/10 space-y-2">
            <span className="text-xs text-mist/60 uppercase tracking-wider">
              Track Management
            </span>
            {trackMessage && (
              <p className={`text-xs ${trackMessage.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                {trackMessage}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleClearTrack}
                disabled={isClearing}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-salt-white bg-red-600/80 hover:bg-red-600 disabled:bg-mist/30 rounded transition-colors"
              >
                {isClearing ? "Clearing..." : "Clear Track"}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-salt-white bg-teal-accent/80 hover:bg-teal-accent disabled:bg-mist/30 rounded transition-colors"
              >
                {isUploading ? "Uploading..." : "Upload GPX"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,application/gpx+xml"
                onChange={handleGPXUpload}
                className="hidden"
              />
            </div>
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
