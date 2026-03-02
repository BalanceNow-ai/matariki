"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { Button } from "@/components/ui/Button";

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
              View all position and track data stored in Redis.
            </p>

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
