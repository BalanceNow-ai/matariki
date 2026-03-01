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
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/position/diagnostic");
      const data = await res.json();
      setReport(data);
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
