"use client";

import { useState, useRef } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { parseGPXFile } from "@/lib/gpx-parser";

interface DiagnosticResult {
  status: "pass" | "fail" | "warn";
  message: string;
  detail?: string;
  data?: unknown;
}

interface GPXDiagnosticReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, DiagnosticResult>;
  environment: {
    redisConfigured: boolean;
    webhookSecretConfigured: boolean;
    nodeEnv: string;
  };
  trackData: {
    permanentTrackCount: number;
    latestPosition: unknown;
    sampleTrackPoints: unknown[];
  };
}

interface ParseTestResult {
  success: boolean;
  processingTimeMs: number;
  contentAnalysis?: {
    contentLength: number;
    preview: string;
    hasXmlDeclaration: boolean;
    hasGpxTag: boolean;
    hasWaypoints: boolean;
    hasTrackPoints: boolean;
    hasRoutePoints: boolean;
  };
  parseResult?: {
    pointsFound: number;
    errors: string[];
    warnings: string[];
    parseDetails: {
      waypointsFound: number;
      trackPointsFound: number;
      routePointsFound: number;
      hasGpxTag: boolean;
      xmlDeclaration: boolean;
    };
    samplePoints: unknown[];
    firstPoint: unknown;
    lastPoint: unknown;
  };
  wouldImport?: boolean;
  message?: string;
  error?: string;
  details?: string;
  stack?: string;
}

interface ImportResult {
  success?: boolean;
  error?: string;
  message?: string;
  details?: string;
  imported?: number;
  firstPoint?: unknown;
  lastPoint?: unknown;
}

const CHECK_LABELS: Record<string, string> = {
  redisConfiguration: "Redis Storage",
  authConfiguration: "Authentication",
  trackDataAccess: "Track Data Access",
  gpxParser: "GPX Parser",
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
  overall: GPXDiagnosticReport["overall"];
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

function JsonDisplay({ data, title }: { data: unknown; title?: string }) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const lines = json.split("\n");
  const isLong = lines.length > 10;

  return (
    <div className="mt-2">
      {title && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-storm-grey uppercase">{title}</span>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-teal-accent hover:underline"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      )}
      <pre className="text-xs text-mist bg-deep-ocean/50 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
        {isLong && !expanded ? lines.slice(0, 10).join("\n") + "\n..." : json}
      </pre>
    </div>
  );
}

export default function GPXDiagnosticPage() {
  const [report, setReport] = useState<GPXDiagnosticReport | null>(null);
  const [parseResult, setParseResult] = useState<ParseTestResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/position/import-gpx/diagnostic");
      const data = await res.json();
      setReport(data);
    } catch {
      setError("Failed to reach diagnostic endpoint. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const testParse = async (file: File) => {
    setTesting(true);
    setParseResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("gpx", file);

      const res = await fetch("/api/position/import-gpx/diagnostic", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setParseResult(data);
    } catch (err) {
      setError(`Failed to test parse: ${err}`);
    } finally {
      setTesting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const importGPX = async (file: File) => {
    if (!adminToken) {
      setError("Admin token required for import");
      return;
    }

    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      // Parse GPX client-side to avoid Vercel payload limits
      const parseResult = await parseGPXFile(file);

      if (!parseResult.success || parseResult.points.length === 0) {
        const errorMsg = parseResult.errors.length > 0
          ? parseResult.errors.join(", ")
          : "No track points found in GPX file";
        setImportResult({
          success: false,
          error: "Parse failed",
          message: errorMsg,
          details: `File size: ${file.size} bytes`,
        });
        return;
      }

      // Send parsed points as JSON
      const res = await fetch("/api/position/import-gpx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": adminToken,
        },
        body: JSON.stringify({ points: parseResult.points }),
      });
      const data = await res.json();
      setImportResult(data);

      // Refresh diagnostics after import
      if (data.success) {
        await runDiagnostic();
      }
    } catch (err) {
      setError(`Failed to import: ${err}`);
    } finally {
      setImporting(false);
      if (importFileRef.current) {
        importFileRef.current.value = "";
      }
    }
  };

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)]">
          <div className="max-w-4xl mx-auto">
            <SectionLabel label="Diagnostics" className="mb-8" />
            <h1 className="text-h1 text-salt-white mb-4">
              GPX Import Debug
            </h1>
            <p className="text-mist leading-relaxed mb-8">
              Debug and test GPX file imports. Check storage configuration,
              test file parsing, and view current track data.
            </p>

            {/* System Diagnostic */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-salt-white mb-4">
                System Status
              </h2>
              <Button onClick={runDiagnostic} disabled={loading}>
                {loading ? "Running checks..." : "Run System Diagnostic"}
              </Button>
            </div>

            {error && (
              <div className="card p-4 rounded-lg border border-red-500/30 mb-8">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {report && (
              <div className="space-y-6 mb-12">
                {/* Overall status */}
                <div className="card p-6 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="text-salt-white font-medium">
                      Overall Status
                    </h3>
                    <p className="text-sm text-storm-grey mt-1">
                      {report.timestamp}
                    </p>
                  </div>
                  <OverallBadge overall={report.overall} />
                </div>

                {/* Environment */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-3">Environment</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-storm-grey">Redis:</span>{" "}
                      <span className={report.environment.redisConfigured ? "text-sea-green" : "text-copper-accent"}>
                        {report.environment.redisConfigured ? "Connected" : "Not configured"}
                      </span>
                    </div>
                    <div>
                      <span className="text-storm-grey">Auth:</span>{" "}
                      <span className={report.environment.webhookSecretConfigured ? "text-sea-green" : "text-copper-accent"}>
                        {report.environment.webhookSecretConfigured ? "Configured" : "Not set"}
                      </span>
                    </div>
                    <div>
                      <span className="text-storm-grey">Environment:</span>{" "}
                      <span className="text-mist">{report.environment.nodeEnv}</span>
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
                    {check.data !== undefined && <JsonDisplay data={check.data} title="Data" />}
                  </div>
                ))}

                {/* Track Data */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-salt-white font-medium mb-3">Current Track Data</h3>
                  <div className="space-y-3">
                    <p className="text-sm">
                      <span className="text-storm-grey">Permanent track points:</span>{" "}
                      <span className="text-mist font-mono">{report.trackData.permanentTrackCount}</span>
                    </p>
                    {report.trackData.latestPosition !== null && (
                      <JsonDisplay data={report.trackData.latestPosition} title="Latest Position" />
                    )}
                    {report.trackData.sampleTrackPoints.length > 0 ? (
                      <JsonDisplay data={report.trackData.sampleTrackPoints} title="Sample Track Points (first 5)" />
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Test Parse Section */}
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-salt-white mb-4">
                Test GPX Parsing
              </h2>
              <p className="text-sm text-mist mb-4">
                Test GPX file parsing without importing. Shows detailed parse results and errors.
              </p>
              <div className="flex gap-4 items-center">
                <label className="inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all duration-300 bg-transparent border border-mist/30 text-salt-white hover:border-copper-accent hover:text-copper-accent px-6 py-3 text-sm cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gpx,application/gpx+xml,text/xml"
                    onChange={(e) => e.target.files?.[0] && testParse(e.target.files[0])}
                    className="sr-only"
                    disabled={testing}
                  />
                  {testing ? "Testing..." : "Select GPX File to Test"}
                </label>
              </div>

              {parseResult && (
                <div className="mt-6 space-y-4">
                  <div className={`card p-6 rounded-lg border ${parseResult.success ? "border-sea-green/30" : "border-red-500/30"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-salt-white font-medium">Parse Result</h3>
                      <span className={`text-sm font-medium px-3 py-1 rounded ${
                        parseResult.success ? "bg-sea-green/20 text-sea-green" : "bg-red-500/20 text-red-400"
                      }`}>
                        {parseResult.success ? "Success" : "Failed"}
                      </span>
                    </div>

                    <p className="text-sm text-mist mb-4">{parseResult.message || parseResult.error}</p>

                    <div className="text-xs text-storm-grey mb-4">
                      Processing time: {parseResult.processingTimeMs}ms
                    </div>

                    {parseResult.contentAnalysis && (
                      <div className="mb-4">
                        <h4 className="text-sm text-storm-grey uppercase mb-2">Content Analysis</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Size: <span className="text-mist">{parseResult.contentAnalysis.contentLength} bytes</span></div>
                          <div>XML Declaration: <span className={parseResult.contentAnalysis.hasXmlDeclaration ? "text-sea-green" : "text-red-400"}>{parseResult.contentAnalysis.hasXmlDeclaration ? "Yes" : "No"}</span></div>
                          <div>GPX Tag: <span className={parseResult.contentAnalysis.hasGpxTag ? "text-sea-green" : "text-red-400"}>{parseResult.contentAnalysis.hasGpxTag ? "Yes" : "No"}</span></div>
                          <div>Waypoints: <span className={parseResult.contentAnalysis.hasWaypoints ? "text-sea-green" : "text-storm-grey"}>{parseResult.contentAnalysis.hasWaypoints ? "Yes" : "No"}</span></div>
                          <div>Track Points: <span className={parseResult.contentAnalysis.hasTrackPoints ? "text-sea-green" : "text-storm-grey"}>{parseResult.contentAnalysis.hasTrackPoints ? "Yes" : "No"}</span></div>
                          <div>Route Points: <span className={parseResult.contentAnalysis.hasRoutePoints ? "text-sea-green" : "text-storm-grey"}>{parseResult.contentAnalysis.hasRoutePoints ? "Yes" : "No"}</span></div>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-xs text-storm-grey uppercase mb-1">Content Preview</h5>
                          <pre className="text-xs text-mist bg-deep-ocean/50 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {parseResult.contentAnalysis.preview}
                          </pre>
                        </div>
                      </div>
                    )}

                    {parseResult.parseResult && (
                      <div>
                        <h4 className="text-sm text-storm-grey uppercase mb-2">Parse Details</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                          <div>Points Found: <span className="text-mist font-mono">{parseResult.parseResult.pointsFound}</span></div>
                          <div>Waypoints: <span className="text-mist font-mono">{parseResult.parseResult.parseDetails.waypointsFound}</span></div>
                          <div>Track Points: <span className="text-mist font-mono">{parseResult.parseResult.parseDetails.trackPointsFound}</span></div>
                          <div>Route Points: <span className="text-mist font-mono">{parseResult.parseResult.parseDetails.routePointsFound}</span></div>
                        </div>

                        {parseResult.parseResult.errors.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs text-red-400 uppercase mb-1">Errors</h5>
                            <ul className="text-xs text-red-400 list-disc list-inside">
                              {parseResult.parseResult.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {parseResult.parseResult.warnings.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs text-copper-accent uppercase mb-1">Warnings</h5>
                            <ul className="text-xs text-copper-accent list-disc list-inside">
                              {parseResult.parseResult.warnings.map((warn, i) => (
                                <li key={i}>{warn}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {parseResult.parseResult.firstPoint !== null ? (
                          <JsonDisplay data={parseResult.parseResult.firstPoint} title="First Point" />
                        ) : null}
                        {parseResult.parseResult.lastPoint !== null ? (
                          <JsonDisplay data={parseResult.parseResult.lastPoint} title="Last Point" />
                        ) : null}
                        {parseResult.parseResult.samplePoints.length > 0 ? (
                          <JsonDisplay data={parseResult.parseResult.samplePoints} title="Sample Points" />
                        ) : null}
                      </div>
                    )}

                    {parseResult.stack && (
                      <div className="mt-4">
                        <h5 className="text-xs text-red-400 uppercase mb-1">Stack Trace</h5>
                        <pre className="text-xs text-red-400 bg-deep-ocean/50 p-2 rounded overflow-x-auto">
                          {parseResult.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-salt-white mb-4">
                Import GPX File
              </h2>
              <p className="text-sm text-mist mb-4">
                Actually import a GPX file. Requires admin token authentication.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-storm-grey mb-2">Admin Token</label>
                  <input
                    type="password"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    placeholder="Enter SIGNALK_WEBHOOK_SECRET"
                    className="w-full px-4 py-2 bg-deep-ocean/50 border border-mist/20 rounded text-salt-white placeholder-storm-grey focus:border-teal-accent focus:outline-none"
                  />
                </div>

                <div className="flex gap-4 items-center">
                  <label className={`inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all duration-300 gradient-copper text-deep-ocean hover:opacity-90 hover:shadow-lg px-6 py-3 text-sm cursor-pointer ${(importing || !adminToken) ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".gpx,application/gpx+xml,text/xml"
                      onChange={(e) => e.target.files?.[0] && importGPX(e.target.files[0])}
                      className="sr-only"
                      disabled={importing || !adminToken}
                    />
                    {importing ? "Importing..." : "Import GPX File"}
                  </label>
                </div>
              </div>

              {importResult && (
                <div className="mt-6">
                  <div className={`card p-6 rounded-lg border ${importResult.success ? "border-sea-green/30" : "border-red-500/30"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-salt-white font-medium">Import Result</h3>
                      <span className={`text-sm font-medium px-3 py-1 rounded ${
                        importResult.success ? "bg-sea-green/20 text-sea-green" : "bg-red-500/20 text-red-400"
                      }`}>
                        {importResult.success ? "Success" : "Failed"}
                      </span>
                    </div>

                    <p className="text-sm text-mist mb-4">
                      {importResult.message || importResult.error}
                    </p>

                    {importResult.details && (
                      <p className="text-xs text-storm-grey mb-4">
                        Details: {importResult.details}
                      </p>
                    )}

                    {importResult.imported !== undefined && (
                      <p className="text-sm">
                        <span className="text-storm-grey">Points imported:</span>{" "}
                        <span className="text-mist font-mono">{importResult.imported}</span>
                      </p>
                    )}

                    {importResult.firstPoint !== undefined ? (
                      <JsonDisplay data={importResult.firstPoint} title="First Point" />
                    ) : null}
                    {importResult.lastPoint !== undefined ? (
                      <JsonDisplay data={importResult.lastPoint} title="Last Point" />
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="card p-6 rounded-lg mb-12">
              <h2 className="text-lg font-semibold text-salt-white mb-4">
                Troubleshooting
              </h2>
              <div className="space-y-4 text-sm text-mist">
                <div>
                  <h3 className="text-salt-white font-medium mb-1">Common Issues</h3>
                  <ul className="list-disc list-inside space-y-1 text-storm-grey">
                    <li><span className="text-mist">401 Unauthorized</span> - Check your admin token (SIGNALK_WEBHOOK_SECRET)</li>
                    <li><span className="text-mist">No GPX tag found</span> - File may not be valid GPX format</li>
                    <li><span className="text-mist">No track points found</span> - GPX may have different element structure</li>
                    <li><span className="text-mist">Redis not configured</span> - Track data won&apos;t persist between server restarts</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-salt-white font-medium mb-1">GPX Format</h3>
                  <p className="text-storm-grey">
                    The parser supports &lt;wpt&gt; (waypoints), &lt;trkpt&gt; (track points), and &lt;rtept&gt; (route points).
                    Each point must have lat and lon attributes. Optional &lt;time&gt; and &lt;name&gt; elements are also parsed.
                  </p>
                </div>
                <div>
                  <h3 className="text-salt-white font-medium mb-1">Testing Steps</h3>
                  <ol className="list-decimal list-inside space-y-1 text-storm-grey">
                    <li>Run System Diagnostic to check configuration</li>
                    <li>Test Parse your GPX file to validate format</li>
                    <li>If parsing succeeds, use Import with admin token</li>
                    <li>Run diagnostic again to verify track data updated</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
