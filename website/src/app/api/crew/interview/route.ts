/**
 * Streams one turn of the AI crew interview as newline-delimited JSON events:
 *   {"type":"text","text":"…"}            assistant text as it arrives
 *   {"type":"history","entries":[…]}      transcript so far (on reload)
 *   {"type":"done","finished":bool,"turnsRemaining":n}
 *   {"type":"error","message":"…"}        (+ "detail" for admin debug requests)
 * Only conversational text is ever sent; scores and notes stay server-side.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requestHasSessionFor } from "@/lib/crew/session";
import { getApplication } from "@/lib/crew/store";
import { readJson } from "@/lib/crew/request";
import { describeError, isAdminDebugRequest } from "@/lib/crew/auth";
import {
  interviewEnabled,
  MAX_MESSAGE_CHARS,
  MIN_TURN_INTERVAL_MS,
  runInterviewTurn,
  submitWithoutInterview,
} from "@/lib/crew/interview/engine";

export const runtime = "nodejs";
export const preferredRegion = "syd1";
export const maxDuration = 60;

const bodySchema = z.object({
  applicationId: z.string().min(1).max(100),
  message: z.string().trim().max(MAX_MESSAGE_CHARS).nullable().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await readJson(request, 16 * 1024));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!requestHasSessionFor(request, body.applicationId)) {
    return NextResponse.json({ error: "Your session has expired" }, { status: 401 });
  }

  const debug = isAdminDebugRequest(request);
  // Failures before streaming starts (loading the application, the kill-switch
  // submit) return JSON instead of an empty 500.
  const serverError = (error: unknown) => {
    console.error("Interview request failed:", error);
    return NextResponse.json(
      { error: "Sorry, something went wrong on our side. Please try again.", ...(debug ? { detail: describeError(error) } : {}) },
      { status: 500 }
    );
  };

  let app: Awaited<ReturnType<typeof getApplication>>;
  try {
    app = await getApplication(body.applicationId);
  } catch (error) {
    return serverError(error);
  }
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (app.status !== "draft" && app.status !== "interviewing") {
    return NextResponse.json({ finished: true });
  }

  if (!interviewEnabled()) {
    try {
      await submitWithoutInterview(app);
    } catch (error) {
      return serverError(error);
    }
    return NextResponse.json({ finished: true, interviewDisabled: true });
  }

  const message = body.message || null;
  if (message) {
    const last = [...(app.transcript ?? [])].reverse().find((e) => e.role === "applicant");
    if (last && Date.now() - new Date(last.ts).getTime() < MIN_TURN_INTERVAL_MS) {
      return NextResponse.json({ error: "Slow down a little" }, { status: 429, headers: { "Retry-After": "2" } });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for await (const event of runInterviewTurn(app, message)) send(event);
      } catch (error) {
        console.error("Interview turn failed:", error);
        send({
          type: "error",
          message: "Sorry, something went wrong on our side. Please try sending that again.",
          ...(debug ? { detail: describeError(error) } : {}),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
