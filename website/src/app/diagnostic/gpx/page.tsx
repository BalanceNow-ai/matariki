"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { parseGPXFile, type GPXParseResult, type GPXTrackPoint } from "@/lib/gpx-parser";

interface SignalKPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
  name?: string;
  location?: string;
}

interface TrackData {
  redisConfigured: boolean;
  timestamp: string;
  latestPosition?: SignalKPosition;
  permanentTrack?: {
    count: number;
    points: SignalKPosition[];
  };
  positionHistory?: {
    count: number;
    points: SignalKPosition[];
  };
}

function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

function PositionCard({ position, label }: { position: SignalKPosition; label: string }) {
  return (
    <div className="card p-4 rounded-lg">
      <h3 className="text-sm font-medium text-storm-grey uppercase mb-2">{label}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-storm-grey">Lat:</span>{" "}
          <span className="text-salt-white font-mono">{position.latitude?.toFixed(6)}</span>
        </div>
        <div>
          <span className="text-storm-grey">Lon:</span>{" "}
          <span className="text-salt-white font-mono">{position.longitude?.toFixed(6)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-storm-grey">Time:</span>{" "}
          <span className="text-mist">{formatTimestamp(position.timestamp)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-storm-grey">Source:</span>{" "}
          <span className={position.source === "signalk" ? "text-sea-green" : "text-copper-accent"}>
            {position.source}
          </span>
        </div>
        {position.location && (
          <div className="col-span-2">
            <span className="text-storm-grey">Location:</span>{" "}
            <span className="text-mist">{position.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackPointsTable({ points, title }: { points: SignalKPosition[]; title: string }) {
  const [showAll, setShowAll] = useState(false);
  const displayPoints = showAll ? points : points.slice(0, 20);

  return (
    <div className="card p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-storm-grey uppercase">{title}</h3>
        <span className="text-xs text-mist font-mono">{points.length} points</span>
      </div>

      {points.length === 0 ? (
        <p className="text-sm text-storm-grey">No data</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-storm-grey text-left border-b border-mist/20">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Latitude</th>
                  <th className="pb-2 pr-4">Longitude</th>
                  <th className="pb-2 pr-4">Timestamp</th>
                  <th className="pb-2">Source</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {displayPoints.map((point, i) => (
                  <tr key={i} className="border-b border-mist/10 hover:bg-mist/5">
                    <td className="py-2 pr-4 text-storm-grey">{i + 1}</td>
                    <td className="py-2 pr-4 text-salt-white">{point.latitude?.toFixed(6)}</td>
                    <td className="py-2 pr-4 text-salt-white">{point.longitude?.toFixed(6)}</td>
                    <td className="py-2 pr-4 text-mist text-xs">{formatTimestamp(point.timestamp)}</td>
                    <td className={`py-2 ${point.source === "signalk" ? "text-sea-green" : "text-copper-accent"}`}>
                      {point.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {points.length > 20 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-teal-accent hover:underline"
              >
                {showAll ? "Show less" : `Show all ${points.length} points`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RedisDataPage() {
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<GPXParseResult | null>(null);
  const [token, setToken] = useState("");
  const [batchSize, setBatchSize] = useState(1000);
  const [clearFirst, setClearFirst] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    totalPoints: number;
    importedPoints: number;
    totalBatches: number;
    completedBatches: number;
  } | null>(null);
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  const appendUploadLog = (message: string) => {
    setUploadLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/position/track");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(`Failed to fetch data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const parseSelectedFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseResult(null);
    setUploadLog([]);
    appendUploadLog(`Parsing ${file.name}...`);

    try {
      const result = await parseGPXFile(file);
      setParseResult(result);

      if (!result.success) {
        appendUploadLog(`Parse failed: ${result.errors.join(", ") || "Unknown parse error"}`);
      } else {
        appendUploadLog(
          `Parsed ${result.stats.totalPoints} points (${result.stats.trackPointsFound} track points, ${result.stats.segmentsFound} segments)`
        );
        if (result.warnings.length > 0) {
          result.warnings.forEach((w) => appendUploadLog(`Warning: ${w}`));
        }
      }
    } finally {
      setIsParsing(false);
    }
  }, []);

  const clearGpxData = useCallback(async () => {
    appendUploadLog("Clearing existing GPX track data...");
    const headers: HeadersInit = {};
    if (token.trim()) {
      headers["X-API-Key"] = token.trim();
    }

    const res = await fetch("/api/position/clear?mode=gpx", {
      method: "POST",
      headers,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
    }

    appendUploadLog(`Cleared ${json.cleared ?? 0} GPX points`);
  }, [token]);

  const uploadPointsInBatches = useCallback(async (points: GPXTrackPoint[]) => {
    const safeBatchSize = Math.max(1, Math.min(batchSize, 5000));
    const totalBatches = Math.ceil(points.length / safeBatchSize);
    let importedPoints = 0;

    setUploadProgress({
      totalPoints: points.length,
      importedPoints: 0,
      totalBatches,
      completedBatches: 0,
    });

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token.trim()) {
      headers["X-API-Key"] = token.trim();
    }

    for (let i = 0; i < totalBatches; i++) {
      const start = i * safeBatchSize;
      const end = Math.min(start + safeBatchSize, points.length);
      const batch = points.slice(start, end);
      const batchNo = i + 1;

      appendUploadLog(`Uploading batch ${batchNo}/${totalBatches} (${batch.length} points)...`);

      const res = await fetch("/api/position/import-gpx", {
        method: "POST",
        headers,
        body: JSON.stringify({ points: batch }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          `Batch ${batchNo} failed: ${json?.message || json?.error || `HTTP ${res.status}`}`
        );
      }

      const imported = Number(json.imported ?? batch.length);
      importedPoints += imported;
      setUploadProgress({
        totalPoints: points.length,
        importedPoints,
        totalBatches,
        completedBatches: batchNo,
      });
      appendUploadLog(`Batch ${batchNo} complete: ${imported} imported`);
    }

    appendUploadLog(`Upload complete: ${importedPoints}/${points.length} points imported`);
  }, [batchSize, token]);

  const handleUpload = useCallback(async () => {
    if (!parseResult?.success || parseResult.points.length === 0) {
      setError("Select and parse a valid GPX file before uploading");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      if (clearFirst) {
        await clearGpxData();
      }
      await uploadPointsInBatches(parseResult.points);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendUploadLog(`Upload error: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  }, [clearFirst, clearGpxData, fetchData, parseResult, uploadPointsInBatches]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)]">
          <div className="max-w-6xl mx-auto">
            <SectionLabel label="Debug" className="mb-8" />
            <h1 className="text-h1 text-salt-white mb-4">Redis Track Data</h1>
            <p className="text-mist leading-relaxed mb-8">
              Upload historical GPX files and inspect position/track data stored in Redis.
            </p>

            {/* GPX Upload */}
            <div className="card p-4 rounded-lg mb-8 space-y-4">
              <h2 className="text-lg text-salt-white">GPX Upload</h2>
              <p className="text-sm text-mist">
                Large files are parsed in your browser and uploaded in batches to avoid payload/time limits.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-storm-grey uppercase mb-2">GPX file</label>
                  <input
                    type="file"
                    accept=".gpx,application/gpx+xml,application/xml,text/xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      setParseResult(null);
                    }}
                    className="block w-full text-sm text-mist file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-teal-accent/20 file:text-teal-accent hover:file:bg-teal-accent/30"
                  />
                </div>

                <div>
                  <label className="block text-xs text-storm-grey uppercase mb-2">Auth token (optional)</label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="SIGNALK_WEBHOOK_SECRET"
                    className="w-full rounded border border-mist/30 bg-midnight-blue px-3 py-2 text-sm text-salt-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-storm-grey uppercase mb-2">Batch size</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value) || 1000)}
                    className="w-full rounded border border-mist/30 bg-midnight-blue px-3 py-2 text-sm text-salt-white"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-mist cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearFirst}
                      onChange={(e) => setClearFirst(e.target.checked)}
                      className="rounded border-mist/30"
                    />
                    Clear existing GPX data first
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => selectedFile && parseSelectedFile(selectedFile)}
                  disabled={!selectedFile || isParsing || isUploading}
                >
                  {isParsing ? "Parsing..." : "Parse GPX"}
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!parseResult?.success || isUploading || isParsing}
                >
                  {isUploading ? "Uploading..." : "Upload in Batches"}
                </Button>
                {selectedFile && (
                  <span className="text-xs text-mist">{selectedFile.name}</span>
                )}
              </div>

              {parseResult && (
                <div className="rounded border border-mist/20 p-3 text-sm">
                  <div className="text-salt-white mb-1">
                    Parse: {parseResult.success ? "Success" : "Failed"}
                  </div>
                  <div className="text-mist">
                    Total points: {parseResult.stats.totalPoints} | Track: {parseResult.stats.trackPointsFound} | Segments: {parseResult.stats.segmentsFound}
                  </div>
                  {parseResult.errors.length > 0 && (
                    <div className="text-red-400 mt-2">
                      Errors: {parseResult.errors.join("; ")}
                    </div>
                  )}
                  {parseResult.warnings.length > 0 && (
                    <div className="text-copper-accent mt-2">
                      Warnings: {parseResult.warnings.join("; ")}
                    </div>
                  )}
                </div>
              )}

              {uploadProgress && (
                <div className="rounded border border-mist/20 p-3 text-sm text-mist">
                  Imported {uploadProgress.importedPoints}/{uploadProgress.totalPoints} points
                  {" • "}
                  Batches {uploadProgress.completedBatches}/{uploadProgress.totalBatches}
                </div>
              )}

              {uploadLog.length > 0 && (
                <div className="rounded border border-mist/20 p-3 bg-midnight-blue/40">
                  <h3 className="text-xs text-storm-grey uppercase mb-2">Upload log</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto text-xs text-mist font-mono">
                    {uploadLog.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mb-8">
              <Button onClick={fetchData} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </Button>
              <label className="flex items-center gap-2 text-sm text-mist cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-mist/30"
                />
                Auto-refresh (5s)
              </label>
            </div>

            {error && (
              <div className="card p-4 rounded-lg border border-red-500/30 mb-8">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {data && (
              <div className="space-y-8">
                {/* Status */}
                <div className="card p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-storm-grey">Redis:</span>{" "}
                    <span className={data.redisConfigured ? "text-sea-green" : "text-copper-accent"}>
                      {data.redisConfigured ? "Connected" : "Not configured (using memory)"}
                    </span>
                  </div>
                  <div className="text-xs text-storm-grey">
                    Last updated: {formatTimestamp(data.timestamp)}
                  </div>
                </div>

                {/* Latest Position */}
                {data.latestPosition && (
                  <PositionCard position={data.latestPosition} label="Latest Position" />
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="card p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-salt-white mb-1">
                      {data.permanentTrack?.count ?? 0}
                    </div>
                    <div className="text-sm text-storm-grey">Permanent Track Points</div>
                  </div>
                  <div className="card p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-salt-white mb-1">
                      {data.positionHistory?.count ?? 0}
                    </div>
                    <div className="text-sm text-storm-grey">Position History Points</div>
                  </div>
                </div>

                {/* Permanent Track */}
                {data.permanentTrack && (
                  <TrackPointsTable
                    points={data.permanentTrack.points}
                    title="Permanent Track (GPX imports + significant moves)"
                  />
                )}

                {/* Position History */}
                {data.positionHistory && (
                  <TrackPointsTable
                    points={data.positionHistory.points}
                    title="Position History (all recent positions)"
                  />
                )}
              </div>
            )}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
