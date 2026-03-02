"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { OpenSeaMap, VesselPosition, LogEntryWaypoint } from "@/components/map/OpenSeaMap";
import { VesselDataPanel } from "./VesselDataPanel";
import { VoyageContextPanel, Voyage } from "./VoyageContextPanel";
import { WeatherConditionsPanel } from "./WeatherConditionsPanel";
import { SignalKPosition } from "@/app/api/position/store";
import { parseGPXFile } from "@/lib/gpx-parser";

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
  const [gpxDebugLog, setGpxDebugLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug log helper
  const logDebug = useCallback((message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const logEntry = data
      ? `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}`
      : `[${timestamp}] ${message}`;
    console.log("[GPX Debug]", logEntry);
    setGpxDebugLog(prev => [...prev.slice(-50), logEntry]);
  }, []);

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

  // Fetch track history (combines permanent track from GPX imports + recent position history)
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/position/track?type=all", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();

      // Combine permanent track (GPX imports) with position history (live SignalK data)
      // Both are important: GPX provides historical context, history has latest positions
      const permanentPoints: SignalKPosition[] = data.permanentTrack?.points || [];
      const historyPoints: SignalKPosition[] = data.positionHistory?.points || [];

      // Combine both arrays and deduplicate by position (within ~50m)
      const allPoints = [...permanentPoints, ...historyPoints];

      // Sort by timestamp (oldest first for proper track drawing)
      allPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Deduplicate: remove points that are very close together (within 50m)
      const deduped: SignalKPosition[] = [];
      for (const point of allPoints) {
        const isDuplicate = deduped.some(existing => {
          const latDiff = Math.abs(existing.latitude - point.latitude);
          const lonDiff = Math.abs(existing.longitude - point.longitude);
          // ~50m tolerance (rough estimate: 0.0005 degrees ≈ 50m)
          return latDiff < 0.0005 && lonDiff < 0.0005;
        });
        if (!isDuplicate) {
          deduped.push(point);
        }
      }

      const points = deduped;

      setTrackHistory(
        points.map((p: SignalKPosition) => ({
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

  // Handle GPX file upload - parses client-side to avoid Vercel payload limits
  const handleGPXUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous debug log and start fresh
    setGpxDebugLog([]);
    logDebug("=== GPX Upload Started ===");
    logDebug("File info", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    // Parse GPX client-side to extract track points
    logDebug("Parsing GPX client-side...");
    const parseResult = await parseGPXFile(file);

    logDebug("Parse result", {
      success: parseResult.success,
      totalPoints: parseResult.stats.totalPoints,
      waypointsFound: parseResult.stats.waypointsFound,
      trackPointsFound: parseResult.stats.trackPointsFound,
      routePointsFound: parseResult.stats.routePointsFound,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
    });

    if (!parseResult.success || parseResult.points.length === 0) {
      const errorMsg = parseResult.errors.length > 0
        ? parseResult.errors.join(", ")
        : "No track points found in GPX file";
      logDebug("=== Parse FAILED ===", { error: errorMsg });
      setTrackMessage(`Error: ${errorMsg}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Check if admin or prompt for token
    let token = adminToken;
    if (!isAdmin) {
      logDebug("Not admin, prompting for token");
      const authorized = await promptAdminToken();
      if (!authorized) {
        logDebug("Authorization cancelled by user");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      token = sessionStorage.getItem("adminToken");
      logDebug("Token retrieved from session", { hasToken: !!token, length: token?.length || 0 });
    } else {
      logDebug("Admin authenticated", { hasToken: !!token });
    }

    setIsUploading(true);
    setTrackMessage(null);
    try {
      // Send parsed points as JSON instead of raw GPX file
      const payload = JSON.stringify({ points: parseResult.points });
      logDebug("Sending request to /api/position/import-gpx", {
        payloadSize: payload.length,
        originalFileSize: file.size,
        compressionRatio: `${((1 - payload.length / file.size) * 100).toFixed(1)}% smaller`,
      });
      logDebug("Request headers", { "X-API-Key": token ? `${token.slice(0, 4)}...` : "none" });

      const startTime = Date.now();
      const response = await fetch("/api/position/import-gpx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-API-Key": token } : {}),
        },
        body: payload,
      });
      const elapsed = Date.now() - startTime;

      logDebug("Response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        elapsedMs: elapsed,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const data = await response.json();
      logDebug("Response body", data);

      if (response.ok) {
        logDebug("=== Upload SUCCESS ===", { imported: data.imported });
        setTrackMessage(`Imported ${data.imported} waypoints`);
        await fetchHistory();
        setTimeout(() => setTrackMessage(null), 3000);
      } else {
        const errorMsg = [data.error, data.message, data.details].filter(Boolean).join(": ");
        logDebug("=== Upload FAILED ===", { status: response.status, error: errorMsg, fullData: data });
        setTrackMessage(`Error: ${errorMsg || "Failed to import"}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      logDebug("=== Upload EXCEPTION ===", { message: errorMessage, stack: errorStack });
      setTrackMessage(`Error: ${errorMessage || "Network error"}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [fetchHistory, isAdmin, adminToken, promptAdminToken, logDebug]);

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

            {/* GPX Debug Log */}
            {gpxDebugLog.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-mist/60 uppercase tracking-wider">
                    Debug Log
                  </span>
                  <button
                    onClick={() => setGpxDebugLog([])}
                    className="text-xs text-red-400/70 hover:text-red-400"
                  >
                    Clear
                  </button>
                </div>
                <div className="bg-deep-ocean/50 rounded p-2 max-h-48 overflow-y-auto font-mono text-xs">
                  {gpxDebugLog.map((log, i) => (
                    <pre
                      key={i}
                      className={`whitespace-pre-wrap break-all ${
                        log.includes("ERROR") || log.includes("FAILED") || log.includes("EXCEPTION")
                          ? "text-red-400"
                          : log.includes("SUCCESS")
                          ? "text-green-400"
                          : "text-mist/80"
                      }`}
                    >
                      {log}
                    </pre>
                  ))}
                </div>
              </div>
            )}
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
