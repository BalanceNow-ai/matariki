"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { Button } from "@/components/ui/Button";

interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  authStatus: "success" | "failed" | "no-secret";
  tokenPreview?: string;
  payloadFormat: "signalk-delta" | "simplified" | "invalid" | "unknown";
  payloadSize: number;
  rawPayload: unknown;
  parsedPosition?: {
    latitude?: number;
    longitude?: number;
    speedOverGround?: number;
    heading?: number;
  };
  responseStatus: number;
  responseBody: unknown;
  processingTimeMs: number;
  error?: string;
}

interface DebugData {
  timestamp: string;
  currentPosition: {
    hasLiveData: boolean;
    source: string;
    latitude: number;
    longitude: number;
    lastUpdate: string;
    ageMs: number;
  };
  stats: {
    totalRequests: number;
    requestsLast5Min: number;
    historySize: number;
    authStats: { success: number; failed: number; noSecret: number };
    formatStats: { signalkDelta: number; simplified: number; invalid: number };
    avgProcessingTimeMs: number;
  };
  requestLog: RequestLogEntry[];
  webhookConfigured: boolean;
}

function formatAge(ms: number): string {
  if (ms < 1000) return "just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 200 && status < 300
      ? "bg-sea-green/20 text-sea-green"
      : status >= 400
        ? "bg-red-500/20 text-red-400"
        : "bg-copper-accent/20 text-copper-accent";
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${color}`}>
      {status}
    </span>
  );
}

function AuthBadge({ status }: { status: RequestLogEntry["authStatus"] }) {
  const styles = {
    success: "bg-sea-green/20 text-sea-green",
    failed: "bg-red-500/20 text-red-400",
    "no-secret": "bg-copper-accent/20 text-copper-accent",
  };
  const labels = { success: "AUTH OK", failed: "AUTH FAIL", "no-secret": "NO AUTH" };
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function FormatBadge({ format }: { format: RequestLogEntry["payloadFormat"] }) {
  const styles = {
    "signalk-delta": "bg-blue-500/20 text-blue-400",
    simplified: "bg-purple-500/20 text-purple-400",
    invalid: "bg-red-500/20 text-red-400",
    unknown: "bg-storm-grey/20 text-storm-grey",
  };
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${styles[format]}`}>
      {format}
    </span>
  );
}

function RequestRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: RequestLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(entry.timestamp);
  const timeStr = time.toLocaleTimeString("en-NZ", { hour12: false });

  return (
    <div className="border-b border-deep-ocean/50">
      <div
        className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-deep-ocean/30 transition-colors"
        onClick={onToggle}
      >
        <span className="text-xs font-mono text-storm-grey w-20">{timeStr}</span>
        <StatusBadge status={entry.responseStatus} />
        <AuthBadge status={entry.authStatus} />
        <FormatBadge format={entry.payloadFormat} />
        <span className="text-xs text-mist flex-1 truncate">
          {entry.parsedPosition?.latitude !== undefined ? (
            <>
              {entry.parsedPosition.latitude.toFixed(4)},{" "}
              {entry.parsedPosition.longitude?.toFixed(4)}
              {entry.parsedPosition.speedOverGround !== undefined && (
                <span className="text-storm-grey ml-2">
                  SOG: {entry.parsedPosition.speedOverGround.toFixed(1)}kts
                </span>
              )}
            </>
          ) : (
            <span className="text-storm-grey">{entry.error || "No position"}</span>
          )}
        </span>
        <span className="text-xs text-storm-grey">{entry.processingTimeMs}ms</span>
        <span className="text-xs text-storm-grey">{entry.payloadSize}B</span>
        <span className="text-storm-grey">{isExpanded ? "▼" : "▶"}</span>
      </div>

      {isExpanded && (
        <div className="bg-deep-ocean/50 p-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-storm-grey uppercase mb-2">Request Payload</h4>
              <pre className="text-xs text-mist font-mono bg-deep-ocean p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(entry.rawPayload, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-xs text-storm-grey uppercase mb-2">Response</h4>
              <pre className="text-xs text-mist font-mono bg-deep-ocean p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(entry.responseBody, null, 2)}
              </pre>
            </div>
          </div>

          {entry.parsedPosition && (
            <div>
              <h4 className="text-xs text-storm-grey uppercase mb-2">Parsed Position</h4>
              <pre className="text-xs text-mist font-mono bg-deep-ocean p-3 rounded overflow-x-auto">
                {JSON.stringify(entry.parsedPosition, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex gap-4 text-xs text-storm-grey">
            <span>ID: {entry.id}</span>
            {entry.tokenPreview && <span>Token: {entry.tokenPreview}</span>}
            {entry.error && <span className="text-red-400">Error: {entry.error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDebugPage() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [testLoading, setTestLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/position/debug");
      if (!res.ok) {
        const errorText = await res.text();
        setError(`API error (${res.status}): ${errorText || res.statusText}`);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch debug data: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTestRequest = async (format: string, fail: boolean = false) => {
    setTestLoading(true);
    try {
      await fetch(`/api/position/debug?format=${format}${fail ? "&fail=true" : ""}`, {
        method: "POST",
      });
      await fetchData();
    } finally {
      setTestLoading(false);
    }
  };

  const clearLog = async () => {
    await fetch("/api/position/debug", { method: "DELETE" });
    await fetchData();
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)]">
          <div className="max-w-6xl mx-auto">
            <SectionLabel label="Debug" className="mb-4" />
            <h1 className="text-h1 text-salt-white mb-2">Signal K API Debug</h1>
            <p className="text-mist leading-relaxed mb-6">
              Live view of webhook requests from Signal K and API responses.
            </p>

            {error && (
              <div className="card p-4 rounded-lg border border-red-500/30 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-2 text-xs text-copper-accent hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && !data && (
              <div className="card p-8 rounded-lg text-center">
                <div className="animate-pulse text-mist">Loading debug data...</div>
              </div>
            )}

            {data && (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="card p-4 rounded-lg">
                    <div className="text-2xl font-bold text-salt-white">
                      {data.stats.requestsLast5Min}
                    </div>
                    <div className="text-xs text-storm-grey">Requests (5 min)</div>
                  </div>
                  <div className="card p-4 rounded-lg">
                    <div
                      className={`text-2xl font-bold ${data.currentPosition.hasLiveData ? "text-sea-green" : "text-copper-accent"}`}
                    >
                      {data.currentPosition.hasLiveData ? "LIVE" : "FALLBACK"}
                    </div>
                    <div className="text-xs text-storm-grey">
                      {formatAge(data.currentPosition.ageMs)}
                    </div>
                  </div>
                  <div className="card p-4 rounded-lg">
                    <div className="text-2xl font-bold text-salt-white">
                      {data.stats.avgProcessingTimeMs.toFixed(1)}ms
                    </div>
                    <div className="text-xs text-storm-grey">Avg Processing</div>
                  </div>
                  <div className="card p-4 rounded-lg">
                    <div
                      className={`text-2xl font-bold ${data.webhookConfigured ? "text-sea-green" : "text-red-400"}`}
                    >
                      {data.webhookConfigured ? "YES" : "NO"}
                    </div>
                    <div className="text-xs text-storm-grey">Webhook Secret</div>
                  </div>
                </div>

                {/* Current Position */}
                <div className="card p-4 rounded-lg mb-6">
                  <h3 className="text-salt-white font-medium mb-2">Current Position</h3>
                  <div className="font-mono text-sm text-mist">
                    {data.currentPosition.latitude.toFixed(5)},{" "}
                    {data.currentPosition.longitude.toFixed(5)}
                    <span className="text-storm-grey ml-4">
                      Source: {data.currentPosition.source}
                    </span>
                  </div>
                </div>

                {/* Auth & Format Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="card p-4 rounded-lg">
                    <h3 className="text-sm text-storm-grey mb-3">Auth Status</h3>
                    <div className="flex gap-4 text-sm">
                      <span className="text-sea-green">
                        {data.stats.authStats.success} OK
                      </span>
                      <span className="text-red-400">
                        {data.stats.authStats.failed} Failed
                      </span>
                      <span className="text-copper-accent">
                        {data.stats.authStats.noSecret} No Auth
                      </span>
                    </div>
                  </div>
                  <div className="card p-4 rounded-lg">
                    <h3 className="text-sm text-storm-grey mb-3">Payload Formats</h3>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-400">
                        {data.stats.formatStats.signalkDelta} Delta
                      </span>
                      <span className="text-purple-400">
                        {data.stats.formatStats.simplified} Simple
                      </span>
                      <span className="text-red-400">
                        {data.stats.formatStats.invalid} Invalid
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button
                    onClick={() => sendTestRequest("simplified")}
                    disabled={testLoading}
                    variant="ghost"
                  >
                    Send Test (Simple)
                  </Button>
                  <Button
                    onClick={() => sendTestRequest("signalk-delta")}
                    disabled={testLoading}
                    variant="ghost"
                  >
                    Send Test (Delta)
                  </Button>
                  <Button
                    onClick={() => sendTestRequest("invalid", true)}
                    disabled={testLoading}
                    variant="ghost"
                  >
                    Send Invalid
                  </Button>
                  <Button onClick={clearLog} variant="ghost">
                    Clear Log
                  </Button>
                  <label className="flex items-center gap-2 text-mist text-sm cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 rounded border-storm-grey"
                    />
                    Auto-refresh (2s)
                  </label>
                </div>

                {/* Request Log */}
                <div className="card rounded-lg overflow-hidden">
                  <div className="bg-deep-ocean/50 px-3 py-2 border-b border-deep-ocean flex items-center justify-between">
                    <h3 className="text-salt-white font-medium">
                      Request Log ({data.requestLog.length})
                    </h3>
                    {loading && (
                      <span className="text-xs text-storm-grey animate-pulse">
                        Refreshing...
                      </span>
                    )}
                  </div>

                  {data.requestLog.length === 0 ? (
                    <div className="p-8 text-center text-storm-grey">
                      <p>No requests logged yet.</p>
                      <p className="text-sm mt-2">
                        Send a test request or wait for Signal K to send position data.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto">
                      {data.requestLog.map((entry) => (
                        <RequestRow
                          key={entry.id}
                          entry={entry}
                          isExpanded={expandedRows.has(entry.id)}
                          onToggle={() => toggleRow(entry.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Endpoint Info */}
                <div className="card p-6 rounded-lg mt-6">
                  <h3 className="text-salt-white font-medium mb-4">API Endpoint</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-storm-grey">URL:</span>
                      <code className="ml-2 text-mist bg-deep-ocean px-2 py-1 rounded">
                        POST /api/position
                      </code>
                    </div>
                    <div>
                      <span className="text-storm-grey">Auth:</span>
                      <code className="ml-2 text-mist bg-deep-ocean px-2 py-1 rounded">
                        Authorization: Bearer YOUR_SECRET
                      </code>
                    </div>
                    <div className="text-storm-grey">
                      Accepts Signal K delta format or simplified JSON with lat/lon fields.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
