"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { Button } from "@/components/ui/Button";

interface Issue {
  severity: "critical" | "warning" | "info";
  code: string;
  title: string;
  detail: string;
  recommendation: string;
}

interface PositionRef {
  latitude: number;
  longitude: number;
  timestamp: string;
  age: string;
  source: string;
  speedOverGround?: number;
  distanceToCurrentPosition?: string;
}

interface UnrecordedPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  age: string;
  source: string;
  speedOverGround?: number;
}

interface TrackDiagnostic {
  timestamp: string;
  storage: string;
  issues: Issue[];
  latestPosition: {
    source: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    age: string;
    ageMs: number;
    speedOverGround?: number;
    courseOverGround?: number;
    hasLiveData: boolean;
  };
  permanentTrack: {
    description: string;
    totalPoints: number;
    gpxPoints: number;
    signalkPoints: number;
    latestPoint: PositionRef | null;
    distanceToCurrentPosition: string | null;
    distanceToCurrentPositionM: number | null;
    minDistanceThreshold: string;
  };
  lastTrackPositionRef: {
    description: string;
    value: PositionRef | null;
  };
  positionHistory: {
    description: string;
    totalPoints: number;
    signalkPoints: number;
    latestPoint: PositionRef | null;
  };
  recentActivity: {
    positionsLast1h: number;
    positionsLast6h: number;
    positionsLast24h: number;
    cumulativeDistanceLast24h: string;
    maxDistanceFromAnchor: string;
  };
  webhookStatus: {
    totalRequestsLogged: number;
    recentRequestsLast1h: number;
    successfulRequests: number;
    failedRequests: number;
    lastSuccessfulRequest: {
      timestamp: string;
      age: string;
      format: string;
      authMethod?: string;
    } | null;
  };
  recentUnrecordedPositions: UnrecordedPosition[];
}

function SeverityBadge({ severity }: { severity: Issue["severity"] }) {
  const styles = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    warning: "bg-copper-accent/20 text-copper-accent border-copper-accent/30",
    info: "bg-sea-green/20 text-sea-green border-sea-green/30",
  };
  const labels = { critical: "Critical", warning: "Warning", info: "OK" };
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${styles[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: "good" | "warn" | "bad";
}) {
  const color =
    highlight === "good"
      ? "text-sea-green"
      : highlight === "bad"
        ? "text-red-400"
        : highlight === "warn"
          ? "text-copper-accent"
          : "text-salt-white";
  return (
    <div>
      <span className="text-storm-grey text-xs block">{label}</span>
      <span className={`text-lg font-mono ${color}`}>{value}</span>
      {sub && <span className="text-storm-grey text-xs block">{sub}</span>}
    </div>
  );
}

export default function TrackDiagnosticPage() {
  const [data, setData] = useState<TrackDiagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showUnrecorded, setShowUnrecorded] = useState(false);

  const fetchDiagnostic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/position/diagnostic/track", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostic();
  }, [fetchDiagnostic]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchDiagnostic, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchDiagnostic]);

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)]">
          <div className="max-w-4xl mx-auto">
            <SectionLabel label="Diagnostics" className="mb-8" />
            <h1 className="text-h1 text-salt-white mb-2">
              Track Movement Diagnostic
            </h1>
            <p className="text-mist leading-relaxed mb-8">
              Diagnoses why the track line may not show recent vessel movement.
              Compares the two data stores: <strong>permanentTrack</strong> (drives
              the map) vs <strong>positionHistory</strong> (all received updates).
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Button onClick={fetchDiagnostic} disabled={loading}>
                {loading ? "Checking..." : "Run Diagnostic"}
              </Button>
              <label className="flex items-center gap-2 text-mist text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-storm-grey"
                />
                Auto-refresh (15s)
              </label>
            </div>

            {error && (
              <div className="card p-4 rounded-lg border border-red-500/30 mb-8">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {data && (
              <div className="space-y-6">
                {/* Issues */}
                <div className="space-y-3">
                  {data.issues.map((issue, i) => (
                    <div
                      key={i}
                      className={`card p-5 rounded-lg border ${
                        issue.severity === "critical"
                          ? "border-red-500/40"
                          : issue.severity === "warning"
                            ? "border-copper-accent/40"
                            : "border-sea-green/40"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs text-storm-grey font-mono mr-2">
                            {issue.code}
                          </span>
                          <SeverityBadge severity={issue.severity} />
                        </div>
                      </div>
                      <h3 className="text-salt-white font-medium mb-1">
                        {issue.title}
                      </h3>
                      <p className="text-sm text-mist mb-2">{issue.detail}</p>
                      <p className="text-sm text-copper-accent">
                        {issue.recommendation}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Current Position */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">
                    Latest Position
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      label="Source"
                      value={data.latestPosition.source}
                      highlight={
                        data.latestPosition.hasLiveData ? "good" : "bad"
                      }
                    />
                    <StatCard
                      label="Age"
                      value={data.latestPosition.age}
                      highlight={
                        data.latestPosition.ageMs < 300_000
                          ? "good"
                          : data.latestPosition.ageMs < 1_800_000
                            ? "warn"
                            : "bad"
                      }
                    />
                    <StatCard
                      label="Position"
                      value={`${data.latestPosition.latitude.toFixed(5)}, ${data.latestPosition.longitude.toFixed(5)}`}
                    />
                    <StatCard
                      label="SOG"
                      value={
                        data.latestPosition.speedOverGround !== undefined
                          ? `${data.latestPosition.speedOverGround.toFixed(1)} kts`
                          : "N/A"
                      }
                    />
                  </div>
                </div>

                {/* Data Store Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Permanent Track */}
                  <div className="card p-6 rounded-lg border border-copper-accent/20">
                    <h3 className="text-copper-accent font-medium mb-1">
                      Permanent Track
                    </h3>
                    <p className="text-xs text-storm-grey mb-4">
                      {data.permanentTrack.description}
                    </p>
                    <div className="space-y-3">
                      <StatCard
                        label="Total Points"
                        value={data.permanentTrack.totalPoints}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard
                          label="From GPX"
                          value={data.permanentTrack.gpxPoints}
                        />
                        <StatCard
                          label="From SignalK"
                          value={data.permanentTrack.signalkPoints}
                          highlight={
                            data.permanentTrack.signalkPoints === 0
                              ? "warn"
                              : undefined
                          }
                        />
                      </div>
                      {data.permanentTrack.latestPoint && (
                        <>
                          <StatCard
                            label="Latest Track Point"
                            value={data.permanentTrack.latestPoint.age + " ago"}
                            sub={`${data.permanentTrack.latestPoint.source} @ ${data.permanentTrack.latestPoint.latitude.toFixed(5)}, ${data.permanentTrack.latestPoint.longitude.toFixed(5)}`}
                          />
                          <StatCard
                            label="Gap to Current Position"
                            value={data.permanentTrack.distanceToCurrentPosition ?? "N/A"}
                            highlight={
                              (data.permanentTrack.distanceToCurrentPositionM ?? 0) > 1000
                                ? "bad"
                                : (data.permanentTrack.distanceToCurrentPositionM ?? 0) > 200
                                  ? "warn"
                                  : "good"
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Position History */}
                  <div className="card p-6 rounded-lg border border-slate-water/30">
                    <h3 className="text-mist font-medium mb-1">
                      Position History
                    </h3>
                    <p className="text-xs text-storm-grey mb-4">
                      {data.positionHistory.description}
                    </p>
                    <div className="space-y-3">
                      <StatCard
                        label="Total Points"
                        value={data.positionHistory.totalPoints}
                      />
                      <StatCard
                        label="From SignalK"
                        value={data.positionHistory.signalkPoints}
                        highlight={
                          data.positionHistory.signalkPoints === 0
                            ? "warn"
                            : "good"
                        }
                      />
                      {data.positionHistory.latestPoint && (
                        <StatCard
                          label="Latest History Point"
                          value={data.positionHistory.latestPoint.age + " ago"}
                          sub={`${data.positionHistory.latestPoint.source} @ ${data.positionHistory.latestPoint.latitude.toFixed(5)}, ${data.positionHistory.latestPoint.longitude.toFixed(5)}`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Last Track Position Reference */}
                {data.lastTrackPositionRef.value && (
                  <div className="card p-6 rounded-lg">
                    <h3 className="text-salt-white font-medium mb-1">
                      200m Threshold Reference Point
                    </h3>
                    <p className="text-xs text-storm-grey mb-4">
                      {data.lastTrackPositionRef.description}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        label="Position"
                        value={`${data.lastTrackPositionRef.value.latitude.toFixed(5)}, ${data.lastTrackPositionRef.value.longitude.toFixed(5)}`}
                      />
                      <StatCard
                        label="Source"
                        value={data.lastTrackPositionRef.value.source}
                      />
                      <StatCard
                        label="Timestamp"
                        value={new Date(
                          data.lastTrackPositionRef.value.timestamp
                        ).toLocaleString("en-NZ", { dateStyle: "short", timeStyle: "short" })}
                      />
                      <StatCard
                        label="Distance to Current"
                        value={data.lastTrackPositionRef.value.distanceToCurrentPosition ?? "N/A"}
                      />
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">
                    Recent Activity (from positionHistory)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard
                      label="Last 1h"
                      value={data.recentActivity.positionsLast1h}
                      highlight={
                        data.recentActivity.positionsLast1h === 0 ? "warn" : "good"
                      }
                    />
                    <StatCard
                      label="Last 6h"
                      value={data.recentActivity.positionsLast6h}
                    />
                    <StatCard
                      label="Last 24h"
                      value={data.recentActivity.positionsLast24h}
                    />
                    <StatCard
                      label="Distance (24h)"
                      value={data.recentActivity.cumulativeDistanceLast24h}
                    />
                    <StatCard
                      label="Max from Anchor"
                      value={data.recentActivity.maxDistanceFromAnchor}
                    />
                  </div>
                </div>

                {/* Webhook Status */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">
                    Webhook Status
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Logged"
                      value={data.webhookStatus.totalRequestsLogged}
                    />
                    <StatCard
                      label="Last 1h"
                      value={data.webhookStatus.recentRequestsLast1h}
                      highlight={
                        data.webhookStatus.recentRequestsLast1h === 0
                          ? "warn"
                          : "good"
                      }
                    />
                    <StatCard
                      label="Successful"
                      value={data.webhookStatus.successfulRequests}
                      highlight={
                        data.webhookStatus.successfulRequests > 0
                          ? "good"
                          : undefined
                      }
                    />
                    <StatCard
                      label="Failed"
                      value={data.webhookStatus.failedRequests}
                      highlight={
                        data.webhookStatus.failedRequests > 0 ? "bad" : "good"
                      }
                    />
                  </div>
                  {data.webhookStatus.lastSuccessfulRequest && (
                    <div className="mt-4 pt-4 border-t border-slate-water/20">
                      <p className="text-xs text-mist">
                        Last successful request:{" "}
                        <span className="text-salt-white font-mono">
                          {data.webhookStatus.lastSuccessfulRequest.age} ago
                        </span>{" "}
                        via{" "}
                        <span className="text-salt-white">
                          {data.webhookStatus.lastSuccessfulRequest.format}
                        </span>
                        {data.webhookStatus.lastSuccessfulRequest.authMethod && (
                          <>
                            {" "}
                            (auth:{" "}
                            {data.webhookStatus.lastSuccessfulRequest.authMethod})
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Unrecorded Positions */}
                {data.recentUnrecordedPositions.length > 0 && (
                  <div className="card p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-salt-white font-medium">
                          Recent Positions NOT on Track
                        </h3>
                        <p className="text-xs text-storm-grey mt-1">
                          These positions were received but didn&apos;t meet the 200m
                          threshold for the permanent track
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowUnrecorded(!showUnrecorded)}
                      >
                        {showUnrecorded ? "Hide" : "Show"} (
                        {data.recentUnrecordedPositions.length})
                      </Button>
                    </div>
                    {showUnrecorded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-storm-grey border-b border-slate-water/20">
                              <th className="text-left py-2 pr-4">Age</th>
                              <th className="text-left py-2 pr-4">Lat</th>
                              <th className="text-left py-2 pr-4">Lng</th>
                              <th className="text-left py-2 pr-4">SOG</th>
                              <th className="text-left py-2">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.recentUnrecordedPositions.map((pos, i) => (
                              <tr
                                key={i}
                                className="border-b border-slate-water/10 text-mist"
                              >
                                <td className="py-1.5 pr-4 font-mono">
                                  {pos.age}
                                </td>
                                <td className="py-1.5 pr-4 font-mono">
                                  {pos.latitude.toFixed(5)}
                                </td>
                                <td className="py-1.5 pr-4 font-mono">
                                  {pos.longitude.toFixed(5)}
                                </td>
                                <td className="py-1.5 pr-4 font-mono">
                                  {pos.speedOverGround?.toFixed(1) ?? "-"}
                                </td>
                                <td className="py-1.5">{pos.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw JSON toggle */}
                <details className="card p-6 rounded-lg">
                  <summary className="text-salt-white font-medium cursor-pointer">
                    Raw JSON Response
                  </summary>
                  <pre className="mt-4 text-xs text-mist font-mono bg-deep-ocean p-4 rounded overflow-x-auto max-h-96">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </details>

                {/* How it works */}
                <div className="card p-6 rounded-lg border border-slate-water/20">
                  <h3 className="text-salt-white font-medium mb-3">
                    How Tracking Works
                  </h3>
                  <div className="space-y-3 text-sm text-mist">
                    <div>
                      <h4 className="text-copper-accent font-medium">
                        Data Flow
                      </h4>
                      <p className="mt-1">
                        Signal K on the boat sends position data to{" "}
                        <code className="text-xs bg-deep-ocean px-1 rounded">
                          POST /api/position
                        </code>
                        . Each update is stored in two places:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                        <li>
                          <strong>positionHistory</strong> &mdash; Every received
                          position (for auditing). Not displayed on the map.
                        </li>
                        <li>
                          <strong>permanentTrack</strong> &mdash; Only positions
                          &gt;200m from the last recorded track point. This drives
                          the orange line on the map.
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-copper-accent font-medium">
                        Why Track Stops Updating
                      </h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                        <li>
                          Vessel is stationary or making small movements
                          (&lt;200m)
                        </li>
                        <li>
                          Signal K webhook has stopped sending data (check
                          webhook status above)
                        </li>
                        <li>
                          Authentication mismatch between boat and server
                        </li>
                        <li>
                          Boat has no internet connectivity
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
