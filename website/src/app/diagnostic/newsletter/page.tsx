"use client";

import { useState } from "react";
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
}

const CHECK_LABELS: Record<string, string> = {
  apiKeyConfigured: "API Key Configuration",
  apiReachable: "Buttondown API Connectivity",
  endpointConfig: "Endpoint Configuration",
  subscribeEndpoint: "Subscribe Route Health",
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

export default function NewsletterDiagnosticPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/subscribe/diagnostic");
      const data = await res.json();
      setReport(data);
    } catch {
      setError("Failed to reach diagnostic endpoint. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)]">
          <div className="max-w-2xl mx-auto">
            <SectionLabel label="Diagnostics" className="mb-8" />
            <h1 className="text-h1 text-salt-white mb-4">
              Newsletter Diagnostic
            </h1>
            <p className="text-mist leading-relaxed mb-8">
              Check the health of the Buttondown newsletter integration.
              This runs connectivity, authentication, and configuration checks.
            </p>

            <div className="mb-8">
              <Button onClick={runDiagnostic} disabled={loading}>
                {loading ? "Running checks..." : "Run Diagnostic"}
              </Button>
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
              </div>
            )}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
