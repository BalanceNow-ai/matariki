/**
 * One turn of the crew interview.
 *
 * The applicant only ever receives the assistant's conversational text. Tool
 * inputs (notes, scores, the assessment) stay on the server.
 */
import "server-only";
import { z } from "zod";
import { getInterviewProvider, type ChatMessage, type ToolResult, type ToolSpec } from "./providers";
import {
  buildApplicantDataTurn,
  buildTrustedContext,
  CLOSING_MESSAGE,
  experienceLevel,
  describePassage,
  FORCED_FINALISE_INSTRUCTION,
  INTERVIEW_SYSTEM_PROMPT,
  REFUSAL_CLOSING_MESSAGE,
  REFUSAL_RED_FLAG,
  SUMMARY_SYSTEM_PROMPT,
  WRAP_UP_INSTRUCTION,
  wrapApplicantMessage,
  wrapSummary,
} from "../interviewPrompt";
import { pageFactsForPrompt } from "../pageContent";
import { passagesById, scenariosFor } from "../passages";
import { appendNotes, appendTranscript, getApplication, submitWithAssessment } from "../store";
import { sendSubmissionEmails } from "../email";
import { buildAssessment, FINALISE_JSON_SCHEMA, finaliseInputSchema, type FinaliseInput } from "../scoring";
import { injectionRedFlags } from "../injection";
import { DIMENSIONS, type Assessment, type CrewApplication, type InterviewNote, type Passage, type TranscriptEntry } from "../types";

export const MAX_APPLICANT_TURNS = 14;
export const MAX_DURATION_MS = 30 * 60 * 1000;
export const MIN_TURN_INTERVAL_MS = 2000;
/** Older turns are summarised once the applicant has taken this many. */
export const SUMMARISE_AFTER_TURNS = 10;
/** Transcript entries always sent verbatim, however long the interview. */
export const KEEP_RECENT_ENTRIES = 6;
export const MAX_MESSAGE_CHARS = 2000;
/** Wrap up when less than this much of the 30 minutes is left. */
const WRAP_UP_MARGIN_MS = 3 * 60 * 1000;
const MAX_TOOL_ROUNDS = 4;
export { TURN_MAX_TOKENS } from "./providers/anthropic";

/** Raised when the model declines a request. We never retry on another model. */
export class ModelRefusal extends Error {
  constructor(where: string) {
    super(`Model refused (${where})`);
  }
}

export type InterviewEvent =
  | { type: "history"; entries: { role: TranscriptEntry["role"]; content: string }[] }
  | { type: "text"; text: string }
  | { type: "done"; finished: boolean; turnsRemaining: number };

const noteInputSchema = z.object({
  dimension: z.enum([...DIMENSIONS, "general"]),
  note: z.string().trim().min(1).max(600),
  evidence: z.string().trim().max(600).default(""),
});

/** Tool definitions, shared by every provider (each maps them to its own format). */
export const INTERVIEW_TOOLS: ToolSpec[] = [
  {
    name: "get_passage_details",
    description: "Look up the published details of one of the applicant's passages by id.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["passageId"],
      properties: { passageId: { type: "string" } },
    },
  },
  {
    name: "record_note",
    description:
      "Privately record an observation for Greg about one rubric dimension, with the specific evidence (a short quote or fact). Never record health or protected personal information.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["dimension", "note", "evidence"],
      properties: {
        dimension: { type: "string", enum: [...DIMENSIONS, "general"] },
        note: { type: "string" },
        evidence: { type: "string" },
      },
    },
  },
  {
    name: "finalise_assessment",
    description:
      "Submit the private assessment for Greg at the end of the interview. Call exactly once, after your closing message. Exactly 3 callQuestions; summary at most 100 words.",
    schema: FINALISE_JSON_SCHEMA as unknown as Record<string, unknown>,
  },
];

function applicantTurns(entries: Pick<TranscriptEntry, "role">[]): number {
  return entries.filter((e) => e.role === "applicant").length;
}

function capsReached(turns: number, startedAt: Date, now: Date): boolean {
  return turns >= MAX_APPLICANT_TURNS || now.getTime() - startedAt.getTime() >= MAX_DURATION_MS;
}

type Context = {
  app: CrewApplication;
  passages: Passage[];
  /** Trusted system text only (prompt, passages, scenarios, page facts). */
  system: string[];
};

async function loadContext(app: CrewApplication): Promise<Context> {
  const passages = await passagesById(app.passages).catch(() => [] as Passage[]);
  const level = experienceLevel(app);
  const types = [...new Set(passages.map((p) => p.type))];
  const scenarios = await scenariosFor(types, level).catch(() => []);
  return {
    app,
    passages,
    system: [
      INTERVIEW_SYSTEM_PROMPT,
      buildTrustedContext({ passages, scenarios: scenarios.slice(0, 6), level, pageFacts: pageFactsForPrompt() }),
    ],
  };
}

/** Rebuild the conversation from the stored transcript (text only). */
export function buildMessages(app: CrewApplication, entries: Pick<TranscriptEntry, "role" | "content">[]): ChatMessage[] {
  const summary = app.transcriptSummary;
  const skip = summary ? Math.min(summary.coversEntries, entries.length) : 0;
  const first = buildApplicantDataTurn(app) + (summary && skip > 0 ? `\n\n${wrapSummary(summary.text)}` : "");
  const messages: ChatMessage[] = [{ role: "user", content: first }];
  for (const e of entries.slice(skip)) {
    messages.push(
      e.role === "assistant"
        ? { role: "assistant", content: e.content || "…" }
        : { role: "user", content: wrapApplicantMessage(e.content) }
    );
  }
  return messages;
}

function coerceFinalise(raw: unknown): FinaliseInput | null {
  const first = finaliseInputSchema.safeParse(raw);
  if (first.success) return first.data;
  // The only common miss is the question count; repair it rather than lose the assessment.
  if (raw && typeof raw === "object" && Array.isArray((raw as { callQuestions?: unknown }).callQuestions)) {
    const qs = ((raw as { callQuestions: unknown[] }).callQuestions.filter((q) => typeof q === "string") as string[]).slice(0, 3);
    while (qs.length < 3) qs.push("Talk me through your most demanding passage and your role on it.");
    const retry = finaliseInputSchema.safeParse({ ...raw, callQuestions: qs });
    if (retry.success) return retry.data;
  }
  return null;
}

function automaticRedFlags(app: CrewApplication, entries: Pick<TranscriptEntry, "role" | "content">[]): string[] {
  return injectionRedFlags([
    { name: "the CV", text: app.cv?.extractedText },
    {
      name: "the form",
      text: [app.applicant.motivation, app.applicant.longestPassage, app.applicant.availabilityNotes, app.applicant.safetyNotes, app.applicant.otherQualifications]
        .filter(Boolean)
        .join("\n"),
    },
    {
      name: "the applicant's interview messages",
      text: entries.filter((e) => e.role === "applicant").map((e) => e.content).join("\n"),
    },
  ]);
}

export type FinaliseOutcome =
  | { kind: "assessment"; assessment: Assessment }
  | { kind: "failed" }
  | { kind: "refused" };

/** When the caps hit before the model finalised: ask for the assessment as structured output. */
export async function forceFinalise(ctx: Context, entries: Pick<TranscriptEntry, "role" | "content">[]): Promise<FinaliseOutcome> {
  // Structured output against the finalise_assessment schema (a forced tool
  // call isn't available on claude-sonnet-5-5, so every provider does it this way).
  const messages = buildMessages(ctx.app, entries);
  messages.push({ role: "user", content: FORCED_FINALISE_INSTRUCTION });
  try {
    const res = await getInterviewProvider().structured({
      system: ctx.system,
      messages,
      schema: FINALISE_JSON_SCHEMA as unknown as Record<string, unknown>,
    });
    if (res.refused) return { kind: "refused" };
    const parsed = coerceFinalise(JSON.parse(res.text));
    return parsed
      ? { kind: "assessment", assessment: buildAssessment(parsed, automaticRedFlags(ctx.app, entries), "forced") }
      : { kind: "failed" };
  } catch (error) {
    console.error("Forced finalise failed:", error);
    return { kind: "failed" };
  }
}

async function maybeSummarise(app: CrewApplication, entries: TranscriptEntry[]): Promise<CrewApplication["transcriptSummary"] | null> {
  if (applicantTurns(entries) <= SUMMARISE_AFTER_TURNS) return null;
  const cover = entries.length - KEEP_RECENT_ENTRIES;
  if (cover <= (app.transcriptSummary?.coversEntries ?? 0)) return null;
  const transcript = entries
    .slice(0, cover)
    .map((e) => `${e.role === "assistant" ? "Assistant" : "Applicant"}: ${e.content}`)
    .join("\n");
  try {
    const res = await getInterviewProvider().complete({
      system: SUMMARY_SYSTEM_PROMPT,
      user: `<transcript>\n${transcript.replace(/<\/?transcript>/gi, "")}\n</transcript>`,
    });
    if (res.refused) throw new ModelRefusal("transcript summary");
    const text = res.text.trim();
    return text ? { coversEntries: cover, text } : null;
  } catch (error) {
    if (error instanceof ModelRefusal) throw error;
    console.error("Transcript summary failed:", error);
    return null;
  }
}

async function finish(ctx: Context, assessment: Assessment | null, redFlags: string[] = []): Promise<void> {
  await submitWithAssessment(ctx.app._id, assessment, new Date(), redFlags);
  const fresh = await getApplication(ctx.app._id);
  if (fresh) await sendSubmissionEmails(fresh, ctx.passages.map((p) => p.title));
}

async function finishForced(ctx: Context, entries: Pick<TranscriptEntry, "role" | "content">[]): Promise<void> {
  const outcome = await forceFinalise(ctx, entries);
  if (outcome.kind === "assessment") await finish(ctx, outcome.assessment);
  else await finish(ctx, null, outcome.kind === "refused" ? [REFUSAL_RED_FLAG] : []);
}

/** Kill-switch path: no interview, straight to submitted. */
export async function submitWithoutInterview(app: CrewApplication): Promise<void> {
  const passages = await passagesById(app.passages).catch(() => [] as Passage[]);
  await finish({ app, passages, system: [] }, null);
}

export function interviewEnabled(): boolean {
  return process.env.CREW_INTERVIEW_ENABLED !== "false";
}

export async function* runInterviewTurn(
  app: CrewApplication,
  message: string | null,
  now: Date = new Date()
): AsyncGenerator<InterviewEvent> {
  const entries: TranscriptEntry[] = [...(app.transcript ?? [])];
  const startedAt = app.interviewStartedAt ? new Date(app.interviewStartedAt) : now;

  // Reload: replay what's been said without calling the model.
  if (!message && entries.length > 0) {
    yield { type: "history", entries: entries.map(({ role, content }) => ({ role, content })) };
    yield { type: "done", finished: false, turnsRemaining: MAX_APPLICANT_TURNS - applicantTurns(entries) };
    return;
  }

  const ctx = await loadContext(app);

  // Caps already reached (e.g. the 30 minutes ran out between messages).
  if (capsReached(applicantTurns(entries), startedAt, now)) {
    yield* closeOut(ctx, entries, message, now);
    return;
  }

  const newEntries: Omit<TranscriptEntry, "_key">[] = [];
  if (message) {
    const applicantEntry = { role: "applicant" as const, content: message, ts: now.toISOString() };
    entries.push({ _key: "pending", ...applicantEntry });
    newEntries.push(applicantEntry);
  }

  const turns = applicantTurns(entries);
  const timeLeft = MAX_DURATION_MS - (now.getTime() - startedAt.getTime());
  const wrapUp = turns >= MAX_APPLICANT_TURNS || timeLeft <= WRAP_UP_MARGIN_MS;

  const conversation = getInterviewProvider().conversation({
    system: ctx.system,
    messages: buildMessages(app, entries),
    tools: INTERVIEW_TOOLS,
    systemNote: wrapUp ? WRAP_UP_INSTRUCTION : undefined,
  });

  const notes: Omit<InterviewNote, "_key">[] = [];
  let finalised: FinaliseInput | null = null;
  let truncatedFinalise = false;
  let refused = false;
  let assistantText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const turn = conversation.round();
    let step = await turn.next();
    while (!step.done) {
      assistantText += step.value;
      yield { type: "text", text: step.value };
      step = await turn.next();
    }
    const reply = step.value;

    if (reply.stop === "refusal") {
      // No retry on another model: close the interview and let Greg pick it up.
      refused = true;
      const text = (assistantText.trim() ? "\n\n" : "") + REFUSAL_CLOSING_MESSAGE;
      assistantText += text;
      yield { type: "text", text };
      break;
    }

    const toolUses = reply.toolCalls;
    if (reply.stop !== "tool_use" || toolUses.length === 0) {
      if (reply.stop === "max_tokens" && toolUses.some((t) => t.name === "finalise_assessment")) truncatedFinalise = true;
      break;
    }

    const results: ToolResult[] = [];
    const result = (tool: (typeof toolUses)[number], content: string, isError = false) =>
      results.push({ id: tool.id, name: tool.name, content, isError });
    for (const tool of toolUses) {
      if (tool.name === "get_passage_details") {
        const id = (tool.input as { passageId?: unknown })?.passageId;
        const p = ctx.passages.find((x) => x._id === id);
        result(tool, p ? describePassage(p) : "No such passage among the applicant's choices.", !p);
      } else if (tool.name === "record_note") {
        const parsed = noteInputSchema.safeParse(tool.input);
        if (parsed.success) notes.push(parsed.data);
        result(tool, parsed.success ? "Noted." : "Invalid note.", !parsed.success);
      } else if (tool.name === "finalise_assessment") {
        const parsed = coerceFinalise(tool.input);
        if (parsed) {
          finalised = parsed;
          result(
            tool,
            assistantText.trim()
              ? "Saved. Do not write anything further."
              : "Saved. Now write a brief, warm closing message for the applicant. No scores or outcome."
          );
        } else {
          const issues = finaliseInputSchema.safeParse(tool.input).error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`) ?? [];
          result(tool, `Invalid assessment: ${issues.join("; ")}`, true);
        }
      } else {
        result(tool, "Unknown tool.", true);
      }
    }
    conversation.addToolResults(results);
    // Once finalised, allow one more round only if a closing message is still needed.
    if (finalised && assistantText.trim()) break;
  }

  if (!assistantText.trim() && finalised) {
    assistantText = CLOSING_MESSAGE;
    yield { type: "text", text: CLOSING_MESSAGE };
  }

  const assistantEntry = { role: "assistant" as const, content: assistantText.trim() || "…", ts: new Date().toISOString() };
  newEntries.push(assistantEntry);
  entries.push({ _key: "pending", ...assistantEntry });

  const set: Parameters<typeof appendTranscript>[2] = {};
  if (!app.interviewStartedAt) set.interviewStartedAt = startedAt.toISOString();
  if (app.status === "draft") set.status = "interviewing";
  await appendTranscript(app._id, newEntries, set);
  await appendNotes(app._id, notes);

  if (refused) {
    await finish(ctx, null, [REFUSAL_RED_FLAG]);
    yield { type: "done", finished: true, turnsRemaining: 0 };
    return;
  }

  if (finalised) {
    await finish(ctx, buildAssessment(finalised, automaticRedFlags(app, entries), "model"));
    yield { type: "done", finished: true, turnsRemaining: 0 };
    return;
  }

  const nowAfter = new Date(Math.max(Date.now(), now.getTime()));
  if (truncatedFinalise || capsReached(applicantTurns(entries), startedAt, nowAfter) || wrapUp) {
    await finishForced(ctx, entries);
    if (!/greg/i.test(assistantText)) yield { type: "text", text: `\n\n${CLOSING_MESSAGE}` };
    yield { type: "done", finished: true, turnsRemaining: 0 };
    return;
  }

  let summary: Awaited<ReturnType<typeof maybeSummarise>> = null;
  try {
    summary = await maybeSummarise(app, entries);
  } catch (error) {
    if (!(error instanceof ModelRefusal)) throw error;
    // This turn's reply has already been shown; close politely and submit.
    yield { type: "text", text: `\n\n${REFUSAL_CLOSING_MESSAGE}` };
    await appendTranscript(app._id, [{ role: "assistant", content: REFUSAL_CLOSING_MESSAGE, ts: new Date().toISOString() }]);
    await finish(ctx, null, [REFUSAL_RED_FLAG]);
    yield { type: "done", finished: true, turnsRemaining: 0 };
    return;
  }
  if (summary) await appendTranscript(app._id, [], { transcriptSummary: summary });

  yield { type: "done", finished: false, turnsRemaining: Math.max(0, MAX_APPLICANT_TURNS - applicantTurns(entries)) };
}

async function* closeOut(
  ctx: Context,
  entries: TranscriptEntry[],
  message: string | null,
  now: Date
): AsyncGenerator<InterviewEvent> {
  const newEntries: Omit<TranscriptEntry, "_key">[] = [];
  if (message) newEntries.push({ role: "applicant", content: message, ts: now.toISOString() });
  newEntries.push({ role: "assistant", content: CLOSING_MESSAGE, ts: now.toISOString() });
  await appendTranscript(ctx.app._id, newEntries);
  const all = [...entries, ...newEntries.map((e) => ({ _key: "x", ...e }))];
  yield { type: "text", text: CLOSING_MESSAGE };
  await finishForced(ctx, all);
  yield { type: "done", finished: true, turnsRemaining: 0 };
}
