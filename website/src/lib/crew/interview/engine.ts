/**
 * One turn of the crew interview.
 *
 * The applicant only ever receives the assistant's conversational text. Tool
 * inputs (notes, scores, the assessment) stay on the server.
 */
import "server-only";
import { z } from "zod";
import { getAnthropic, INTERVIEW_MODEL } from "../anthropic";
import {
  buildApplicantDataTurn,
  buildTrustedContext,
  CLOSING_MESSAGE,
  experienceLevel,
  describePassage,
  FORCED_FINALISE_INSTRUCTION,
  INTERVIEW_SYSTEM_PROMPT,
  REFUSAL_MESSAGE,
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

import type * as Beta from "@anthropic-ai/sdk/resources/beta";
type MessageParam = Beta.BetaMessageParam;

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
export const TURN_MAX_TOKENS = 600;
const FINALISE_MAX_TOKENS = 3000;

const BETAS: Beta.AnthropicBeta[] = ["server-side-fallback-2026-07-01"];

export type InterviewEvent =
  | { type: "history"; entries: { role: TranscriptEntry["role"]; content: string }[] }
  | { type: "text"; text: string }
  | { type: "done"; finished: boolean; turnsRemaining: number };

const noteInputSchema = z.object({
  dimension: z.enum([...DIMENSIONS, "general"]),
  note: z.string().trim().min(1).max(600),
  evidence: z.string().trim().max(600).default(""),
});

export const INTERVIEW_TOOLS: Beta.BetaTool[] = [
  {
    name: "get_passage_details",
    description: "Look up the published details of one of the applicant's passages by id.",
    strict: true,
    input_schema: {
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
    strict: true,
    input_schema: {
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
    strict: true,
    input_schema: FINALISE_JSON_SCHEMA as unknown as Beta.BetaTool["input_schema"],
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
  system: Beta.BetaTextBlockParam[];
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
      { type: "text", text: INTERVIEW_SYSTEM_PROMPT },
      { type: "text", text: buildTrustedContext({ passages, scenarios: scenarios.slice(0, 6), level, pageFacts: pageFactsForPrompt() }) },
    ],
  };
}

/** Rebuild the conversation from the stored transcript (text only). */
export function buildMessages(app: CrewApplication, entries: Pick<TranscriptEntry, "role" | "content">[]): MessageParam[] {
  const summary = app.transcriptSummary;
  const skip = summary ? Math.min(summary.coversEntries, entries.length) : 0;
  const first = buildApplicantDataTurn(app) + (summary && skip > 0 ? `\n\n${wrapSummary(summary.text)}` : "");
  const messages: MessageParam[] = [{ role: "user", content: first }];
  for (const e of entries.slice(skip)) {
    messages.push(
      e.role === "assistant"
        ? { role: "assistant", content: e.content || "…" }
        : { role: "user", content: wrapApplicantMessage(e.content) }
    );
  }
  return messages;
}

function textOf(message: Beta.BetaMessage): string {
  return message.content
    .filter((b): b is Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
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

/** When the caps hit before the model finalised: ask for the assessment as structured output. */
export async function forceFinalise(ctx: Context, entries: Pick<TranscriptEntry, "role" | "content">[]): Promise<Assessment | null> {
  // claude-sonnet-5-5 rejects a forced tool_choice, so the "forced call" uses
  // structured output against the same schema as the finalise tool.
  const messages = buildMessages(ctx.app, entries);
  messages.push({ role: "user", content: FORCED_FINALISE_INSTRUCTION });
  try {
    const res = await getAnthropic().beta.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: FINALISE_MAX_TOKENS,
      betas: BETAS,
      fallbacks: "default",
      system: ctx.system,
      output_config: { effort: "medium", format: { type: "json_schema", schema: FINALISE_JSON_SCHEMA as unknown as Record<string, unknown> } },
      messages,
    });
    if (res.stop_reason === "refusal") return null;
    const parsed = coerceFinalise(JSON.parse(textOf(res)));
    return parsed ? buildAssessment(parsed, automaticRedFlags(ctx.app, entries), "forced") : null;
  } catch (error) {
    console.error("Forced finalise failed:", error);
    return null;
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
    const res = await getAnthropic().beta.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 600,
      betas: BETAS,
      fallbacks: "default",
      system: SUMMARY_SYSTEM_PROMPT,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `<transcript>\n${transcript.replace(/<\/?transcript>/gi, "")}\n</transcript>` }],
    });
    const text = textOf(res).trim();
    return text ? { coversEntries: cover, text } : null;
  } catch (error) {
    console.error("Transcript summary failed:", error);
    return null;
  }
}

async function finish(ctx: Context, assessment: Assessment | null): Promise<void> {
  await submitWithAssessment(ctx.app._id, assessment);
  const fresh = await getApplication(ctx.app._id);
  if (fresh) await sendSubmissionEmails(fresh, ctx.passages.map((p) => p.title));
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

  const messages = buildMessages(app, entries);
  if (wrapUp) messages.push({ role: "system", content: WRAP_UP_INSTRUCTION } as MessageParam);

  const notes: Omit<InterviewNote, "_key">[] = [];
  let finalised: FinaliseInput | null = null;
  let truncatedFinalise = false;
  let assistantText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = getAnthropic().beta.messages.stream({
      model: INTERVIEW_MODEL,
      max_tokens: TURN_MAX_TOKENS,
      betas: BETAS,
      fallbacks: "default",
      // Conversation turns are short and latency-sensitive; no extended reasoning.
      thinking: { type: "between_tools" },
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" },
      system: ctx.system,
      tools: INTERVIEW_TOOLS,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) {
        assistantText += event.delta.text;
        yield { type: "text", text: event.delta.text };
      }
    }
    const reply = await stream.finalMessage();

    if (reply.stop_reason === "refusal") {
      const text = (assistantText ? "\n\n" : "") + REFUSAL_MESSAGE;
      assistantText += text;
      yield { type: "text", text };
      break;
    }

    const toolUses = reply.content.filter((b): b is Beta.BetaToolUseBlock => b.type === "tool_use");
    if (reply.stop_reason !== "tool_use" || toolUses.length === 0) {
      if (reply.stop_reason === "max_tokens" && toolUses.some((t) => t.name === "finalise_assessment")) truncatedFinalise = true;
      break;
    }

    messages.push({ role: "assistant", content: reply.content });
    const results: Beta.BetaToolResultBlockParam[] = [];
    for (const tool of toolUses) {
      if (tool.name === "get_passage_details") {
        const id = (tool.input as { passageId?: unknown })?.passageId;
        const p = ctx.passages.find((x) => x._id === id);
        results.push({ type: "tool_result", tool_use_id: tool.id, content: p ? describePassage(p) : "No such passage among the applicant's choices.", is_error: !p });
      } else if (tool.name === "record_note") {
        const parsed = noteInputSchema.safeParse(tool.input);
        if (parsed.success) notes.push(parsed.data);
        results.push({ type: "tool_result", tool_use_id: tool.id, content: parsed.success ? "Noted." : "Invalid note.", is_error: !parsed.success });
      } else if (tool.name === "finalise_assessment") {
        const parsed = coerceFinalise(tool.input);
        if (parsed) {
          finalised = parsed;
          results.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: assistantText.trim()
              ? "Saved. Do not write anything further."
              : "Saved. Now write a brief, warm closing message for the applicant. No scores or outcome.",
          });
        } else {
          const issues = finaliseInputSchema.safeParse(tool.input).error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`) ?? [];
          results.push({ type: "tool_result", tool_use_id: tool.id, is_error: true, content: `Invalid assessment: ${issues.join("; ")}` });
        }
      } else {
        results.push({ type: "tool_result", tool_use_id: tool.id, is_error: true, content: "Unknown tool." });
      }
    }
    messages.push({ role: "user", content: results });
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

  if (finalised) {
    await finish(ctx, buildAssessment(finalised, automaticRedFlags(app, entries), "model"));
    yield { type: "done", finished: true, turnsRemaining: 0 };
    return;
  }

  const nowAfter = new Date(Math.max(Date.now(), now.getTime()));
  if (truncatedFinalise || capsReached(applicantTurns(entries), startedAt, nowAfter) || wrapUp) {
    const assessment = await forceFinalise(ctx, entries);
    await finish(ctx, assessment);
    if (!/greg/i.test(assistantText)) yield { type: "text", text: `\n\n${CLOSING_MESSAGE}` };
    yield { type: "done", finished: true, turnsRemaining: 0 };
    return;
  }

  const summary = await maybeSummarise(app, entries);
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
  const assessment = await forceFinalise(ctx, all);
  await finish(ctx, assessment);
  yield { type: "done", finished: true, turnsRemaining: 0 };
}
