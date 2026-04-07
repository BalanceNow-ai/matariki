"use client";

import { useState, useEffect } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { Button } from "@/components/ui/Button";

interface DiagnosticResult {
  status: "pass" | "fail" | "warn";
  message: string;
  detail?: string;
}

interface DiagnosticReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, DiagnosticResult>;
  position: {
    hasLiveData: boolean;
    source: string;
    latitude: number;
    longitude: number;
    lastUpdate: string;
    age: string;
    historyCount: number;
  };
  rawPosition: Record<string, unknown>;
}

interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  authStatus: "success" | "failed" | "no-secret";
  authMethod?: string;
  tokenPreview?: string;
  payloadFormat: string;
  payloadSize: number;
  rawPayload: unknown;
  parsedPosition?: Record<string, unknown>;
  responseStatus: number;
  responseBody: unknown;
  processingTimeMs: number;
  error?: string;
}

interface DebugInfo {
  timestamp: string;
  storage: string;
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
    authMethods: Record<string, number>;
    formatStats: { signalkDelta: number; simplified: number; nestedPosition: number; invalid: number };
    avgProcessingTimeMs: number;
  };
  requestLog: RequestLogEntry[];
  webhookConfigured: boolean;
}

const CHECK_LABELS: Record<string, string> = {
  webhookSecretConfigured: "Webhook Secret Configuration",
  liveDataReceived: "Live Signal K Data",
  positionHistory: "Position History",
  telemetryData: "Telemetry Data (SOG, Wind, Depth)",
};

function StatusBadge({ status }: { status: DiagnosticResult["status"] }) {
  const styles = {
    pass: "bg-sea-green/20 text-sea-green",
    fail: "bg-red-500/20 text-red-400",
    warn: "bg-copper-accent/20 text-copper-accent",
  };
  const labels = { pass: "Pass", fail: "Fail", warn: "Warning" };

  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function OverallBadge({
  overall,
}: {
  overall: DiagnosticReport["overall"];
}) {
  const styles = {
    healthy: "bg-sea-green/20 text-sea-green border-sea-green/30",
    degraded: "bg-copper-accent/20 text-copper-accent border-copper-accent/30",
    unhealthy: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels = {
    healthy: "Healthy",
    degraded: "Degraded",
    unhealthy: "Unhealthy",
  };

  return (
    <span
      className={`inline-block text-sm font-semibold px-3 py-1 rounded border ${styles[overall]}`}
    >
      {labels[overall]}
    </span>
  );
}

function formatCoord(value: number, isLat: boolean): string {
  const abs = Math.abs(value);
  const dir = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${abs.toFixed(5)}°${dir}`;
}

export default function PositionDiagnosticPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showRawPayloads, setShowRawPayloads] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const [diagRes, debugRes] = await Promise.all([
        fetch("/api/position/diagnostic"),
        fetch("/api/position/debug"),
      ]);
      const [diagData, debugData] = await Promise.all([
        diagRes.json(),
        debugRes.json(),
      ]);
      setReport(diagData);
      setDebugInfo(debugData);
    } catch {
      setError("Failed to reach diagnostic endpoint. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const sendTestPosition = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/position/diagnostic?test=true", {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
      // Refresh diagnostics after test
      await runDiagnostic();
    } catch (err) {
      setTestResult({ error: String(err) });
    } finally {
      setTestLoading(false);
    }
  };

  // Run diagnostic on mount
  useEffect(() => {
    runDiagnostic();
  }, []);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runDiagnostic, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)]">
          <div className="max-w-3xl mx-auto">
            <SectionLabel label="Diagnostics" className="mb-8" />
            <h1 className="text-h1 text-salt-white mb-4">
              Position Data Debug
            </h1>
            <p className="text-mist leading-relaxed mb-8">
              Debug tool to verify position data is being received from Signal K
              on the Cerbo GX device. Use this to troubleshoot tracking issues.
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              <Button onClick={runDiagnostic} disabled={loading}>
                {loading ? "Checking..." : "Run Diagnostic"}
              </Button>
              <Button variant="ghost" onClick={sendTestPosition} disabled={testLoading}>
                {testLoading ? "Sending..." : "Send Test Position"}
              </Button>
              <label className="flex items-center gap-2 text-mist text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-storm-grey"
                />
                Auto-refresh (10s)
              </label>
            </div>

            {error && (
              <div className="card p-4 rounded-lg border border-red-500/30 mb-8">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {report && (
              <div className="space-y-6">
                {/* Overall status */}
                <div className="card p-6 rounded-lg flex items-center justify-between">
                  <div>
                    <h2 className="text-salt-white font-medium">
                      Overall Status
                    </h2>
                    <p className="text-sm text-storm-grey mt-1">
                      {report.timestamp}
                    </p>
                  </div>
                  <OverallBadge overall={report.overall} />
                </div>

                {/* Position summary */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">Current Position</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-storm-grey">Source:</span>
                      <span className={`ml-2 ${report.position.hasLiveData ? "text-sea-green" : "text-copper-accent"}`}>
                        {report.position.source === "signalk" ? "Signal K (Live)" : "Fallback"}
                      </span>
                    </div>
                    <div>
                      <span className="text-storm-grey">Last Update:</span>
                      <span className="ml-2 text-mist">{report.position.age}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey">Latitude:</span>
                      <span className="ml-2 text-salt-white font-mono">
                        {formatCoord(report.position.latitude, true)}
                      </span>
                    </div>
                    <div>
                      <span className="text-storm-grey">Longitude:</span>
                      <span className="ml-2 text-salt-white font-mono">
                        {formatCoord(report.position.longitude, false)}
                      </span>
                    </div>
                    <div>
                      <span className="text-storm-grey">History:</span>
                      <span className="ml-2 text-mist">{report.position.historyCount} positions</span>
                    </div>
                  </div>
                </div>

                {/* Individual checks */}
                {Object.entries(report.checks).map(([key, check]) => (
                  <div key={key} className="card p-6 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-salt-white font-medium">
                        {CHECK_LABELS[key] || key}
                      </h3>
                      <StatusBadge status={check.status} />
                    </div>
                    <p className="text-sm text-mist">{check.message}</p>
                    {check.detail && (
                      <p className="text-xs text-storm-grey mt-2 font-mono break-all">
                        {check.detail}
                      </p>
                    )}
                  </div>
                ))}

                {/* Raw position data */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">Raw Position Data</h3>
                  <pre className="text-xs text-mist font-mono bg-deep-ocean p-4 rounded overflow-x-auto">
                    {JSON.stringify(report.rawPosition, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Debug Info - Request Log */}
            {debugInfo && (
              <div className="space-y-6 mt-8">
                <h2 className="text-h2 text-salt-white">Request Log Analysis</h2>

                {/* Stats summary */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">Webhook Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-storm-grey block">Total Requests</span>
                      <span className="text-salt-white text-lg font-mono">{debugInfo.stats.totalRequests}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Last 5 Minutes</span>
                      <span className="text-salt-white text-lg font-mono">{debugInfo.stats.requestsLast5Min}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Avg Processing</span>
                      <span className="text-salt-white text-lg font-mono">{debugInfo.stats.avgProcessingTimeMs.toFixed(0)}ms</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Storage</span>
                      <span className={`text-lg font-mono ${debugInfo.storage === "redis" ? "text-sea-green" : "text-copper-accent"}`}>
                        {debugInfo.storage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auth stats */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">Authentication Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-storm-grey block">Successful</span>
                      <span className="text-sea-green text-lg font-mono">{debugInfo.stats.authStats.success}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Failed</span>
                      <span className={`text-lg font-mono ${debugInfo.stats.authStats.failed > 0 ? "text-red-400" : "text-mist"}`}>
                        {debugInfo.stats.authStats.failed}
                      </span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">No Secret</span>
                      <span className="text-copper-accent text-lg font-mono">{debugInfo.stats.authStats.noSecret}</span>
                    </div>
                  </div>

                  {Object.keys(debugInfo.stats.authMethods).length > 0 && (
                    <div>
                      <span className="text-storm-grey text-xs block mb-2">Auth Methods Used:</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(debugInfo.stats.authMethods).map(([method, count]) => (
                          <span key={method} className="text-xs bg-midnight-blue px-2 py-1 rounded text-mist">
                            {method}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payload format stats */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-4">Payload Formats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-storm-grey block">Signal K Delta</span>
                      <span className="text-sea-green text-lg font-mono">{debugInfo.stats.formatStats.signalkDelta}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Simplified</span>
                      <span className="text-sea-green text-lg font-mono">{debugInfo.stats.formatStats.simplified}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Nested Position</span>
                      <span className="text-sea-green text-lg font-mono">{debugInfo.stats.formatStats.nestedPosition}</span>
                    </div>
                    <div>
                      <span className="text-storm-grey block">Invalid</span>
                      <span className={`text-lg font-mono ${debugInfo.stats.formatStats.invalid > 0 ? "text-red-400" : "text-mist"}`}>
                        {debugInfo.stats.formatStats.invalid}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent requests table */}
                <div className="card p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-salt-white font-medium">Recent Requests</h3>
                    <label className="flex items-center gap-2 text-mist text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showRawPayloads}
                        onChange={(e) => setShowRawPayloads(e.target.checked)}
                        className="w-4 h-4 rounded border-storm-grey"
                      />
                      Show Raw Payloads
                    </label>
                  </div>

                  {debugInfo.requestLog.length === 0 ? (
                    <p className="text-storm-grey text-sm italic">No requests logged yet. Send a test position or wait for webhook data.</p>
                  ) : (
                    <div className="space-y-4">
                      {debugInfo.requestLog.slice(0, 10).map((req) => (
                        <div key={req.id} className="bg-deep-ocean p-4 rounded-lg border border-slate-water/30">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                req.responseStatus === 200 ? "bg-sea-green/20 text-sea-green" :
                                req.responseStatus === 401 ? "bg-red-500/20 text-red-400" :
                                "bg-copper-accent/20 text-copper-accent"
                              }`}>
                                {req.responseStatus}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                req.authStatus === "success" ? "bg-sea-green/20 text-sea-green" :
                                req.authStatus === "failed" ? "bg-red-500/20 text-red-400" :
                                "bg-copper-accent/20 text-copper-accent"
                              }`}>
                                Auth: {req.authStatus}
                              </span>
                              <span className="text-xs bg-midnight-blue px-2 py-0.5 rounded text-mist">
                                {req.payloadFormat}
                              </span>
                            </div>
                            <span className="text-xs text-storm-grey">
                              {new Date(req.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="text-xs text-mist space-y-1">
                            {req.authMethod && (
                              <div>
                                <span className="text-storm-grey">Auth Method:</span>{" "}
                                <span className="font-mono">{req.authMethod}</span>
                                {req.tokenPreview && (
                                  <span className="text-storm-grey ml-2">Token: {req.tokenPreview}</span>
                                )}
                              </div>
                            )}

                            {req.parsedPosition && (
                              <div>
                                <span className="text-storm-grey">Position:</span>{" "}
                                <span className="font-mono text-sea-green">
                                  {(req.parsedPosition.latitude as number)?.toFixed(5)}, {(req.parsedPosition.longitude as number)?.toFixed(5)}
                                </span>
                                {req.parsedPosition.speedOverGround !== undefined && (
                                  <span className="ml-2">SOG: {(req.parsedPosition.speedOverGround as number)?.toFixed(1)}kts</span>
                                )}
                              </div>
                            )}

                            {req.error && (
                              <div className="text-red-400">
                                <span className="text-storm-grey">Error:</span> {req.error}
                              </div>
                            )}

                            <div>
                              <span className="text-storm-grey">Payload Size:</span> {req.payloadSize} bytes
                              <span className="text-storm-grey ml-4">Processing:</span> {req.processingTimeMs}ms
                            </div>
                          </div>

                          {showRawPayloads && req.rawPayload ? (
                            <pre className="mt-2 text-xs text-storm-grey font-mono bg-midnight-blue p-2 rounded overflow-x-auto max-h-32">
                              {JSON.stringify(req.rawPayload, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className="card p-6 rounded-lg mt-6">
                <h3 className="text-salt-white font-medium mb-4">Test Position Result</h3>
                <pre className="text-xs text-mist font-mono bg-deep-ocean p-4 rounded overflow-x-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}

            {/* Troubleshooting guide */}
            <div className="card p-6 rounded-lg mt-8">
              <h3 className="text-salt-white font-medium mb-4">Troubleshooting Guide</h3>
              <div className="space-y-4 text-sm text-mist">
                <div>
                  <h4 className="text-copper-accent font-medium">No Live Data Received</h4>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Check that Cerbo GX has internet connectivity</li>
                    <li>Verify Signal K is running and configured to send webhooks</li>
                    <li>Ensure webhook URL is set to: <code className="text-xs bg-deep-ocean px-1 rounded">https://matarikiyacht.com/api/position</code></li>
                    <li>Check that SIGNALK_WEBHOOK_SECRET matches on boat and server</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-copper-accent font-medium">Position Updates But No Telemetry</h4>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Signal K plugin may not be configured to send all data paths</li>
                    <li>Check Signal K data browser for available paths</li>
                    <li>Sensors (wind, depth) may not be connected to Cerbo GX</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-copper-accent font-medium">Webhook Authentication Failing</h4>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Server logs will show &quot;Auth failed&quot; with partial token</li>
                    <li>Send token as: Bearer header, X-Auth-Token header, or ?token= query param</li>
                    <li>Generate new secret: <code className="text-xs bg-deep-ocean px-1 rounded">openssl rand -hex 32</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-copper-accent font-medium">Webhook Endpoint Test</h4>
                  <p className="mt-2">Test with curl:</p>
                  <pre className="mt-2 text-xs bg-deep-ocean p-3 rounded overflow-x-auto">
{`curl -X POST https://matarikiyacht.com/api/position \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_SECRET" \\
  -d '{"latitude":-35.7275,"longitude":174.3278,"speedOverGround":5}'`}
                  </pre>
                </div>
              </div>
            </div>

            {/* DNS Note */}
            <div className="card p-6 rounded-lg mt-6 border border-copper-accent/30">
              <h3 className="text-copper-accent font-medium mb-2">About DNS Settings</h3>
              <p className="text-sm text-mist">
                DNS settings are <strong>not</strong> the issue here. The website loads correctly,
                which means DNS is working. The issue is that the Signal K device on the boat
                is not successfully sending position data to the webhook endpoint. Check the
                boat&apos;s internet connectivity and Signal K webhook configuration.
              </p>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
