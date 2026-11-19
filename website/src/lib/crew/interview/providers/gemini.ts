/**
 * Gemini 4 Argon behind the interview provider interface.
 *
 * Differences from the Claude path, all forced by the model:
 * - Thinking can't be turned off on Gemini 4 models; `low` is the minimum.
 * - `maxOutputTokens` caps thinking + reply together, so the caps here are
 *   ceilings that leave room for thinking. Reply length is held by the system
 *   prompt (two to four sentences), not by the token cap.
 * - There is no mid-conversation system role, so trusted extra instructions
 *   (wrap up) are appended to the system instruction, never to user content.
 * - The model's parts, including thought signatures, are sent back exactly
 *   as received between tool rounds, as the API requires.
 */
import "server-only";
import { BlockedReason, FinishReason, ThinkingLevel, type Content, type GenerateContentConfig, type GenerateContentResponse, type Part } from "@google/genai";
import { getGemini, GEMINI_INTERVIEW_MODEL } from "../../gemini";
import type { ChatMessage, InterviewProvider, RoundResult, RoundStop, TextResult, ToolResult, ToolSpec, TurnConversation } from "./types";

export const GEMINI_TURN_MAX_OUTPUT_TOKENS = 16_384;
const GEMINI_FINALISE_MAX_OUTPUT_TOKENS = 32_768;
const GEMINI_SUMMARY_MAX_OUTPUT_TOKENS = 8_192;
const THINKING = { thinkingLevel: ThinkingLevel.LOW };

/** Finish reasons that mean the model (or its safety system) declined. */
const REFUSAL_FINISH = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION,
  FinishReason.IMAGE_SAFETY,
  FinishReason.IMAGE_PROHIBITED_CONTENT,
]);

export function isBlocked(res: GenerateContentResponse): boolean {
  const block = res.promptFeedback?.blockReason;
  if (block && block !== BlockedReason.BLOCKED_REASON_UNSPECIFIED) return true;
  const finish = res.candidates?.[0]?.finishReason;
  return Boolean(finish && REFUSAL_FINISH.has(finish));
}

export function toContents(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
}

const systemInstruction = (system: string[], note?: string) => [...system, ...(note ? [note] : [])].join("\n\n");

/** Visible reply text only: never thought summaries. */
function visibleText(res: GenerateContentResponse): string {
  return (res.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
}

class GeminiConversation implements TurnConversation {
  private readonly contents: Content[];
  private lastParts: Part[] = [];
  private lastCallIds = new Map<string, string | undefined>();

  constructor(
    private readonly config: GenerateContentConfig,
    messages: ChatMessage[]
  ) {
    this.contents = toContents(messages);
  }

  async *round(): AsyncGenerator<string, RoundResult> {
    const stream = await getGemini().models.generateContentStream({
      model: GEMINI_INTERVIEW_MODEL,
      contents: this.contents,
      config: this.config,
    });
    const parts: Part[] = [];
    const toolCalls: RoundResult["toolCalls"] = [];
    this.lastCallIds = new Map();
    let finish: string | undefined;
    let blocked = false;

    for await (const chunk of stream) {
      if (isBlocked(chunk)) blocked = true;
      const candidate = chunk.candidates?.[0];
      if (candidate?.finishReason) finish = candidate.finishReason;
      for (const part of candidate?.content?.parts ?? []) {
        parts.push(part); // verbatim, thought signatures included
        if (part.functionCall?.name) {
          const id = `call_${toolCalls.length}`;
          this.lastCallIds.set(id, part.functionCall.id);
          toolCalls.push({ id, name: part.functionCall.name, input: part.functionCall.args ?? {} });
        } else if (typeof part.text === "string" && part.text && !part.thought) {
          yield part.text;
        }
      }
    }
    this.lastParts = parts;

    let stop: RoundStop = "end";
    if (blocked) stop = "refusal";
    else if (toolCalls.length) stop = "tool_use";
    else if (finish === FinishReason.MAX_TOKENS) stop = "max_tokens";
    return { stop, toolCalls };
  }

  addToolResults(results: ToolResult[]): void {
    if (!this.lastParts.length) return;
    this.contents.push({ role: "model", parts: this.lastParts });
    this.contents.push({
      role: "user",
      parts: results.map((r) => {
        const id = this.lastCallIds.get(r.id);
        return {
          functionResponse: {
            ...(id ? { id } : {}),
            name: r.name,
            response: r.isError ? { error: r.content } : { output: r.content },
          },
        };
      }),
    });
  }
}

function toFunctionDeclarations(tools: ToolSpec[]) {
  return [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.schema })) }];
}

export const geminiProvider: InterviewProvider = {
  id: "gemini",
  model: GEMINI_INTERVIEW_MODEL,

  conversation({ system, messages, tools, systemNote }) {
    return new GeminiConversation(
      {
        systemInstruction: systemInstruction(system, systemNote),
        tools: toFunctionDeclarations(tools),
        maxOutputTokens: GEMINI_TURN_MAX_OUTPUT_TOKENS,
        thinkingConfig: THINKING,
      },
      messages
    );
  },

  async structured({ system, messages, schema }): Promise<TextResult> {
    const res = await getGemini().models.generateContent({
      model: GEMINI_INTERVIEW_MODEL,
      contents: toContents(messages),
      config: {
        systemInstruction: systemInstruction(system),
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        maxOutputTokens: GEMINI_FINALISE_MAX_OUTPUT_TOKENS,
        thinkingConfig: THINKING,
      },
    });
    return isBlocked(res) ? { refused: true } : { refused: false, text: visibleText(res) };
  },

  async complete({ system, user }): Promise<TextResult> {
    const res = await getGemini().models.generateContent({
      model: GEMINI_INTERVIEW_MODEL,
      contents: [{ role: "user", parts: [{ text: user }] }],
      config: { systemInstruction: system, maxOutputTokens: GEMINI_SUMMARY_MAX_OUTPUT_TOKENS, thinkingConfig: THINKING },
    });
    return isBlocked(res) ? { refused: true } : { refused: false, text: visibleText(res) };
  },
};
