/**
 * Smoke test for the crew feature on a deployed preview.
 *
 *   npx tsx scripts/crew-preview-smoke.ts --url https://<preview-host>
 *   npx tsx scripts/crew-preview-smoke.ts --url https://<preview-host> --interview-dry-run --session <token>
 *
 * Environment:
 *   CREW_ADMIN_TOKEN                 required for the MCP checks and for error detail in the dry run
 *   VERCEL_AUTOMATION_BYPASS_SECRET  only if the preview has Vercel Deployment Protection on
 *   NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET  (default gjwqcjfo / production)
 *
 * It creates no applications and sends no email. Submitting the form stays a
 * manual browser test, because Turnstile blocks scripted submissions.
 *
 * --interview-dry-run sends ONE interview turn for an application you created
 * by hand in the browser, so the first real Claude call can be checked. Get the
 * session token in that browser tab's devtools console:
 *   JSON.parse(sessionStorage.getItem("crew:session")).sessionToken
 * The token expires 2 hours after the form was submitted.
 */

type Status = "PASS" | "FAIL" | "SKIP";
type Row = { check: string; status: Status; detail: string };

const rows: Row[] = [];
const record = (check: string, status: Status, detail: string) => rows.push({ check, status, detail });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

function usage(message: string): never {
  console.error(`${message}\n\nUsage: npx tsx scripts/crew-preview-smoke.ts --url <preview-url> [--passage <id>] [--interview-dry-run --session <token> [--message <text>]]`);
  process.exit(2);
}

const rawUrl = arg("--url") ?? usage("Missing --url");
let base: URL;
try {
  base = new URL(rawUrl);
} catch {
  usage(`Not a URL: ${rawUrl}`);
}
const adminToken = process.env.CREW_ADMIN_TOKEN;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "gjwqcjfo";
const publicDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const crewDataset = process.env.SANITY_CREW_DATASET || "crew";

/** Fetch against the preview, never following redirects (so Vercel's login redirect is visible). */
async function hit(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (bypass) headers.set("x-vercel-protection-bypass", bypass);
  return fetch(new URL(path, base), { ...init, headers, redirect: "manual" });
}

function protectionHint(res: Response): string | null {
  const loc = res.headers.get("location") ?? "";
  if (res.status >= 300 && res.status < 400 && /vercel\.com\/(login|sso)|_vercel_sso/.test(loc)) {
    return "redirected to Vercel login: Deployment Protection is on (set VERCEL_AUTOMATION_BYPASS_SECRET)";
  }
  if ((res.status === 401 || res.status === 403) && !res.headers.get("www-authenticate")?.includes("matariki-crew")) {
    return `${res.status} from Vercel, not the app: Deployment Protection is probably on (set VERCEL_AUTOMATION_BYPASS_SECRET)`;
  }
  return null;
}

const short = (s: string, n = 120) => (s.length > n ? s.slice(0, n) + "…" : s);

// ── Pages ───────────────────────────────────────────────────────────────────
async function checkPage(path: string) {
  try {
    const res = await hit(path);
    const hint = protectionHint(res);
    if (res.status === 200) record(`GET ${path}`, "PASS", "200");
    else record(`GET ${path}`, "FAIL", hint ?? `${res.status} ${res.statusText}`);
  } catch (e) {
    record(`GET ${path}`, "FAIL", `request failed: ${(e as Error).message}`);
  }
}

// ── MCP ─────────────────────────────────────────────────────────────────────
let rpcId = 0;
async function mcp(method: string, params: unknown, token: string | null) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await hit("/api/mcp", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }) });
  const text = await res.text();
  return { res, text };
}

type ToolResult = { result?: { content?: { type: string; text: string }[]; isError?: boolean }; error?: { message: string } };

async function callTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; detail: string; data?: unknown }> {
  const { res, text } = await mcp("tools/call", { name, arguments: args }, adminToken!);
  if (res.status !== 200) return { ok: false, detail: protectionHint(res) ?? `${res.status}: ${short(text)}` };
  let body: ToolResult;
  try {
    body = JSON.parse(text) as ToolResult;
  } catch {
    return { ok: false, detail: `not JSON: ${short(text)}` };
  }
  if (body.error) return { ok: false, detail: `JSON-RPC error: ${body.error.message}` };
  const out = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) return { ok: false, detail: `tool error: ${short(out)}` };
  try {
    return { ok: true, detail: "ok", data: JSON.parse(out) };
  } catch {
    return { ok: false, detail: `unexpected tool output: ${short(out)}` };
  }
}

async function checkMcp() {
  // Without a token: must be OUR 401, not Vercel's.
  try {
    const { res } = await mcp("tools/list", {}, null);
    const ours = res.headers.get("www-authenticate")?.includes('realm="matariki-crew"');
    if (res.status === 401 && ours) record("MCP without token → 401", "PASS", "401 from the app");
    else record("MCP without token → 401", "FAIL", protectionHint(res) ?? `got ${res.status}`);
  } catch (e) {
    record("MCP without token → 401", "FAIL", `request failed: ${(e as Error).message}`);
  }

  if (!adminToken) {
    record("MCP list_applications", "SKIP", "CREW_ADMIN_TOKEN not set in this shell");
    record("MCP passage_roster", "SKIP", "CREW_ADMIN_TOKEN not set in this shell");
    return;
  }

  try {
    const list = await callTool("list_applications", {});
    if (list.ok && Array.isArray(list.data)) record("MCP list_applications", "PASS", `${list.data.length} application(s)`);
    else record("MCP list_applications", "FAIL", list.ok ? "response was not a list" : list.detail);
  } catch (e) {
    record("MCP list_applications", "FAIL", `request failed: ${(e as Error).message}`);
  }

  let passageId = arg("--passage");
  if (!passageId) {
    try {
      const q = encodeURIComponent('*[_type == "passage" && status == "open" && !(_id in path("drafts.**"))] | order(startDate asc)[0]{ _id, title }');
      const res = await fetch(`https://${projectId}.api.sanity.io/v2024-01-01/data/query/${publicDataset}?query=${q}`);
      const body = (await res.json()) as { result?: { _id: string; title: string } | null };
      passageId = body.result?._id;
      if (!passageId) {
        record("MCP passage_roster", "SKIP", `no open passage in ${publicDataset}; publish one or pass --passage <id>`);
        return;
      }
    } catch (e) {
      record("MCP passage_roster", "FAIL", `could not look up an open passage: ${(e as Error).message}`);
      return;
    }
  }
  try {
    const roster = await callTool("passage_roster", { passageId });
    const data = roster.data as { passage?: { title?: string } | null; placesLeft?: number | null } | undefined;
    if (roster.ok && data?.passage) {
      record("MCP passage_roster", "PASS", `${data.passage.title} (${passageId}): ${data.placesLeft ?? "?"} place(s) left`);
    } else {
      record("MCP passage_roster", "FAIL", roster.ok ? `passage ${passageId} not found by the preview` : roster.detail);
    }
  } catch (e) {
    record("MCP passage_roster", "FAIL", `request failed: ${(e as Error).message}`);
  }
}

// ── Crew dataset privacy (anonymous read straight from Sanity) ──────────────
async function checkDatasetPrivate() {
  const check = `"${crewDataset}" dataset is private`;
  try {
    const q = encodeURIComponent("*[0...1]{_id}");
    const res = await fetch(`https://${projectId}.api.sanity.io/v2024-01-01/data/query/${crewDataset}?query=${q}`);
    if (res.status === 401 || res.status === 403) return record(check, "PASS", `anonymous read refused (${res.status})`);
    if (res.status === 404) return record(check, "FAIL", "dataset not found: create it with `npx sanity dataset create crew --visibility private`");
    const body = (await res.json()) as { result?: unknown[] };
    if (Array.isArray(body.result) && body.result.length === 0) return record(check, "PASS", "anonymous read returns nothing");
    record(check, "FAIL", "ANONYMOUS READ RETURNED DOCUMENTS: make the dataset private now");
  } catch (e) {
    record(check, "FAIL", `request failed: ${(e as Error).message}`);
  }
}

// ── Interview dry run ───────────────────────────────────────────────────────
function applicationIdFrom(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")) as { aid?: string; exp?: number };
    if (payload.exp && payload.exp < Date.now()) console.warn(`! Session token expired at ${new Date(payload.exp).toISOString()}; expect a 401.`);
    return payload.aid ?? null;
  } catch {
    return null;
  }
}

type InterviewEvent = { type: string; text?: string; message?: string; detail?: unknown; finished?: boolean };

async function interviewRequest(applicationId: string, token: string, message: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-crew-session": token };
  // With the admin token, a failed turn includes the Claude API's error (status, type, message).
  if (adminToken) headers["x-crew-debug-token"] = adminToken;
  const res = await hit("/api/crew/interview", { method: "POST", headers, body: JSON.stringify({ applicationId, message }) });
  const body = await res.text();
  const events: InterviewEvent[] = (res.headers.get("content-type") ?? "").includes("ndjson")
    ? body.split("\n").filter(Boolean).map((l) => {
        try {
          return JSON.parse(l) as InterviewEvent;
        } catch {
          return { type: "unparseable", message: l };
        }
      })
    : [];
  return { res, body, events };
}

async function interviewDryRun() {
  const token = arg("--session") ?? process.env.CREW_SESSION_TOKEN ?? usage("--interview-dry-run needs --session <token> (or CREW_SESSION_TOKEN)");
  const applicationId = applicationIdFrom(token) ?? usage("That doesn't look like a crew session token");
  const testMessage = arg("--message") ?? "Kia ora, this is a test message from the preview smoke script. I've sailed about 2,000 miles, mostly coastal.";
  const check = "Interview dry run (one model turn)";

  console.log(`\nInterview dry run for application ${applicationId}`);
  if (!adminToken) console.log("  (CREW_ADMIN_TOKEN not set: a failure will show only the generic error, not the API error)");

  // Step 1: no message. If the interview hasn't started, this IS the model turn (the opener).
  // If it has (the interview page starts it on load), this only returns history: no model call.
  let r = await interviewRequest(applicationId, token, null);
  let sentMessage = false;
  if (r.res.status === 200 && r.events[0]?.type === "history") {
    console.log("  Interview already started in the browser; sending one test message instead.");
    r = await interviewRequest(applicationId, token, testMessage);
    sentMessage = true;
  }

  const reply = r.events.filter((e) => e.type === "text").map((e) => e.text ?? "").join("");
  const errorEvent = r.events.find((e) => e.type === "error");
  console.log(`  HTTP status: ${r.res.status}`);
  console.log(`  Content-Type: ${r.res.headers.get("content-type")}`);
  if (sentMessage) console.log(`  Sent: "${testMessage}"`);

  if (r.res.status !== 200 || errorEvent || (!reply && !(r.events.length === 0 && r.body))) {
    console.log("\n  ── Full response body ──");
    console.log(r.body || "(empty)");
    console.log("  ── end ──");
    const hint = protectionHint(r.res);
    let jsonDetail: unknown = null;
    try {
      jsonDetail = (JSON.parse(r.body) as { detail?: unknown }).detail ?? null;
    } catch {
      /* not JSON */
    }
    const detail = (errorEvent?.detail ?? jsonDetail) as { status?: number; message?: string } | null;
    const why = hint
      ? hint
      : r.res.status === 401
        ? "session token rejected (expired, or for another application)"
        : detail
          ? `${detail.status ?? ""} ${detail.message ?? ""}`.trim()
          : errorEvent || r.res.status >= 500
            ? "server error; re-run with CREW_ADMIN_TOKEN set to see the cause"
            : `HTTP ${r.res.status}`;
    const raw = detail ? JSON.stringify(detail) : "";
    if (/between_tools|thinking/i.test(raw)) {
      console.log("\n  ! The API rejected the thinking setting (Claude: between_tools; Gemini: thinkingLevel LOW). See the body above.");
    }
    if (/GEMINI_API_KEY|API key not valid|API_KEY_INVALID/i.test(raw)) {
      console.log("\n  ! The Gemini key is missing or invalid for this deployment (GEMINI_API_KEY).");
    }
    if (/gemini-4-argon/i.test(raw) && /not found|permission|access/i.test(raw)) {
      console.log("\n  ! This Gemini key can't use gemini-4-argon. Check the key's project has access to the model.");
    }
    record(check, "FAIL", why);
    return;
  }

  // JSON (not a stream): already submitted, or the interview is switched off.
  if (r.events.length === 0) {
    console.log(`  Body: ${r.body}`);
    const body = JSON.parse(r.body) as { finished?: boolean; interviewDisabled?: boolean };
    record(check, "SKIP", body.interviewDisabled ? "CREW_INTERVIEW_ENABLED=false on this preview (application was submitted without an interview)" : "application already submitted; use a fresh one");
    return;
  }

  console.log(`  Reply (first 300 chars):\n  ${reply.slice(0, 300).replace(/\n/g, "\n  ")}`);
  const done = r.events.find((e) => e.type === "done");
  record(check, "PASS", `${reply.length} chars streamed${done?.finished ? "; interview finished" : ""}`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Crew preview smoke test → ${base.origin}`);
  if (!adminToken) console.log("  CREW_ADMIN_TOKEN is not set: MCP tool checks will be skipped.");

  await checkPage("/crew");
  await checkPage("/crew/apply");
  await checkMcp();
  await checkDatasetPrivate();
  if (flag("--interview-dry-run")) await interviewDryRun();

  const w = Math.max(...rows.map((r) => r.check.length), 5);
  console.log(`\n${"Check".padEnd(w)}  Result  Detail`);
  console.log(`${"-".repeat(w)}  ------  ${"-".repeat(40)}`);
  for (const r of rows) console.log(`${r.check.padEnd(w)}  ${r.status.padEnd(6)}  ${r.detail}`);
  const failed = rows.filter((r) => r.status === "FAIL").length;
  console.log(`\n${failed ? `${failed} check(s) failed.` : "All checks passed (SKIPs are listed above)."}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
