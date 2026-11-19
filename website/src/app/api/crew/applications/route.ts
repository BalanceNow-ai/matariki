/**
 * Creates a draft crew application and returns a session token for the
 * applicant's CV upload and interview.
 */
import { NextResponse } from "next/server";
import { createApplicationBodySchema, toStoredApplicant } from "@/lib/crew/schema";
import { verifyTurnstile } from "@/lib/crew/turnstile";
import { limit, tooMany } from "@/lib/crew/ratelimit";
import { clientIp, hashIp, readJson } from "@/lib/crew/request";
import { signSession, SESSION_TTL_MS } from "@/lib/crew/session";
import { createDraft } from "@/lib/crew/store";
import { openPassages } from "@/lib/crew/passages";

export const runtime = "nodejs";
export const preferredRegion = "syd1";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = createApplicationBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400 }
    );
  }

  const ip = clientIp(request);
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
  }

  // Counted after verification so bots can't burn a real applicant's quota.
  const rl = await limit("applications", ip);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds);

  const application = parsed.data.application;

  let openIds: Set<string>;
  try {
    openIds = new Set((await openPassages()).map((p) => p._id));
  } catch (error) {
    console.error("Could not load passages:", error);
    return NextResponse.json({ error: "Applications are temporarily unavailable" }, { status: 503 });
  }
  const passages = [...new Set(application.passages)];
  if (!passages.every((id) => openIds.has(id))) {
    return NextResponse.json({ error: "One of the chosen passages is no longer open" }, { status: 400 });
  }

  try {
    const applicationId = await createDraft({
      applicant: toStoredApplicant(application),
      passages,
      ipHash: hashIp(ip),
    });
    return NextResponse.json(
      {
        applicationId,
        sessionToken: signSession(applicationId),
        expiresInSeconds: SESSION_TTL_MS / 1000,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create crew application:", error);
    return NextResponse.json({ error: "Could not save your application" }, { status: 500 });
  }
}
