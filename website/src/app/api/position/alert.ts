/**
 * Formatting alerts for whichever notification service is configured.
 *
 * These services disagree about where the message goes: Slack reads a `text`
 * field, Discord reads `content`, and ntfy treats the entire request body as
 * the message — so posting JSON to ntfy puts raw JSON on your lock screen.
 * One shape cannot satisfy all three, so the destination is detected from the
 * URL and the request built to suit.
 */

export type AlertFormat = "ntfy" | "slack" | "discord" | "json";

export type AlertSeverity = "critical" | "warning" | "recovery";

export type AlertRequest = {
  body: string;
  headers: Record<string, string>;
};

/**
 * Work out which service a webhook URL belongs to.
 *
 * `override` comes from ALERT_WEBHOOK_FORMAT, needed for a self-hosted ntfy
 * instance whose hostname we cannot recognise.
 */
export function detectAlertFormat(url: string, override?: string): AlertFormat {
  const normalised = override?.trim().toLowerCase();
  if (
    normalised === "ntfy" ||
    normalised === "slack" ||
    normalised === "discord" ||
    normalised === "json"
  ) {
    return normalised;
  }

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "json";
  }

  if (host === "hooks.slack.com") return "slack";
  if (host === "discord.com" || host === "discordapp.com") return "discord";
  if (host === "ntfy.sh" || host.endsWith(".ntfy.sh")) return "ntfy";

  return "json";
}

/**
 * ntfy carries presentation in headers rather than the body.
 *
 * Header values are kept ASCII: emoji are requested via the Tags header, which
 * ntfy renders itself, rather than being placed in Title where non-ASCII bytes
 * are not reliably transported.
 */
function ntfyHeaders(title: string, severity: AlertSeverity): Record<string, string> {
  const tags: Record<AlertSeverity, string> = {
    critical: "rotating_light",
    warning: "warning",
    recovery: "white_check_mark",
  };
  const priority: Record<AlertSeverity, string> = {
    critical: "high",
    warning: "default",
    recovery: "low",
  };

  return {
    "Content-Type": "text/plain; charset=utf-8",
    Title: title,
    Tags: tags[severity],
    Priority: priority[severity],
  };
}

export function buildAlertRequest(options: {
  format: AlertFormat;
  title: string;
  message: string;
  severity: AlertSeverity;
}): AlertRequest {
  const { format, title, message, severity } = options;

  if (format === "ntfy") {
    // Plain body — anything else shows up as literal JSON on the device.
    return { body: message, headers: ntfyHeaders(title, severity) };
  }

  const combined = `${title}\n\n${message}`;
  const json = { "Content-Type": "application/json" };

  if (format === "slack") {
    return { body: JSON.stringify({ text: combined }), headers: json };
  }

  if (format === "discord") {
    return { body: JSON.stringify({ content: combined }), headers: json };
  }

  // Unknown service: send the common field names so most webhook receivers
  // find something they recognise.
  return {
    body: JSON.stringify({ text: combined, content: combined, message: combined, title }),
    headers: json,
  };
}

/**
 * Whether this run should actually send a notification.
 *
 * Without this the cron re-reports the same fault on every run — 24 messages a
 * day about a GPS outage you already know about, which is how alerting gets
 * muted and then ignored. The rules:
 *
 *   - a condition that has just changed is always worth reporting;
 *   - a condition that persists is repeated only once per reminder interval;
 *   - a return to normal is reported once, so you know it is over.
 */
export type AlertDecision =
  | { send: false; reason: "healthy" | "already-notified" }
  | { send: true; reason: "new" | "changed" | "reminder" | "recovered"; severity: AlertSeverity };

export function decideAlert(input: {
  now: number;
  condition: string;
  isDegraded: boolean;
  previous: { condition: string; notifiedAt: string } | null;
  reminderIntervalMs: number;
  severityFor: (condition: string) => AlertSeverity;
}): AlertDecision {
  const { now, condition, isDegraded, previous, reminderIntervalMs, severityFor } = input;

  if (!isDegraded) {
    // Only announce recovery if we actually reported a problem earlier.
    return previous
      ? { send: true, reason: "recovered", severity: "recovery" }
      : { send: false, reason: "healthy" };
  }

  const severity = severityFor(condition);

  if (!previous) return { send: true, reason: "new", severity };
  if (previous.condition !== condition) return { send: true, reason: "changed", severity };

  const sinceNotified = now - new Date(previous.notifiedAt).getTime();
  if (!Number.isFinite(sinceNotified) || sinceNotified >= reminderIntervalMs) {
    return { send: true, reason: "reminder", severity };
  }

  return { send: false, reason: "already-notified" };
}
