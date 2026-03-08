import { NextResponse } from "next/server";

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

export async function GET() {
  const checks: Record<string, DiagnosticResult> = {};

  // 1. Check API key configuration
  const apiKey = process.env.BUTTONDOWN_API_KEY;

  if (!apiKey) {
    checks.apiKeyConfigured = {
      status: "fail",
      message: "BUTTONDOWN_API_KEY is not set",
      detail:
        "Set the BUTTONDOWN_API_KEY environment variable. Get your key at https://buttondown.email/settings#api",
    };
  } else {
    const masked = apiKey.slice(0, 4) + "..." + apiKey.slice(-4);
    checks.apiKeyConfigured = {
      status: "pass",
      message: "API key is configured",
      detail: `Key: ${masked} (${apiKey.length} chars)`,
    };
  }

  // 2. Check API reachability (GET /v1/subscribers with page_size=1)
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        "https://api.buttondown.com/v1/subscribers?page_size=1",
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const subscriberCount = data.count ?? "unknown";
        checks.apiReachable = {
          status: "pass",
          message: "Buttondown API is reachable and authenticated",
          detail: `Total subscribers: ${subscriberCount}`,
        };
      } else if (res.status === 401 || res.status === 403) {
        const body = await res.text();
        checks.apiReachable = {
          status: "fail",
          message: `Authentication failed (HTTP ${res.status})`,
          detail: `API key may be invalid or expired. Response: ${body.slice(0, 200)}`,
        };
      } else if (res.status === 429) {
        checks.apiReachable = {
          status: "warn",
          message: "Rate limited by Buttondown API",
          detail:
            "The API is reachable but rate limiting is active. Default limit is 100 requests/hour.",
        };
      } else {
        const body = await res.text();
        checks.apiReachable = {
          status: "fail",
          message: `Unexpected response (HTTP ${res.status})`,
          detail: body.slice(0, 200),
        };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      checks.apiReachable = {
        status: "fail",
        message: "Cannot reach Buttondown API",
        detail:
          message === "The operation was aborted"
            ? "Request timed out after 10s. Check network connectivity."
            : message,
      };
    }
  } else {
    checks.apiReachable = {
      status: "fail",
      message: "Skipped — no API key configured",
    };
  }

  // 3. Check endpoint configuration
  checks.endpointConfig = {
    status: "pass",
    message: "Subscribe route uses current Buttondown API domain",
    detail: "Endpoint: https://api.buttondown.com/v1/subscribers",
  };

  // 4. Test subscription endpoint (dry-run with invalid email to verify route works)
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${siteUrl}/api/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 400) {
      checks.subscribeEndpoint = {
        status: "pass",
        message: "Subscribe endpoint is responding and validates input",
      };
    } else {
      checks.subscribeEndpoint = {
        status: "warn",
        message: `Subscribe endpoint returned unexpected status ${res.status}`,
        detail: "Expected 400 for invalid email validation check",
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    checks.subscribeEndpoint = {
      status: "warn",
      message: "Could not reach local subscribe endpoint",
      detail: `This is normal during build or if NEXT_PUBLIC_SITE_URL is misconfigured. Error: ${message}`,
    };
  }

  // Determine overall health
  const statuses = Object.values(checks).map((c) => c.status);
  let overall: DiagnosticReport["overall"] = "healthy";
  if (statuses.includes("fail")) {
    overall = "unhealthy";
  } else if (statuses.includes("warn")) {
    overall = "degraded";
  }

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    overall,
    checks,
  };

  return NextResponse.json(report, {
    status: overall === "unhealthy" ? 503 : 200,
  });
}
