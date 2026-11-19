/**
 * The model-facing half of the crew interview, behind one small interface so
 * the engine (caps, tools, persistence, scoring) is the same for every model.
 *
 * Trust boundary, for every provider: `system` and `systemNote` are trusted
 * text written by us. Anything from the applicant (form, CV, messages) only
 * ever arrives inside `messages`, already wrapped as untrusted data.
 */
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ToolSpec = { name: string; description: string; schema: Record<string, unknown> };
export type ToolCall = { id: string; name: string; input: unknown };
export type ToolResult = { id: string; name: string; content: string; isError: boolean };

/** Why a model call stopped, in the engine's terms. */
export type RoundStop = "end" | "tool_use" | "max_tokens" | "refusal";
export type RoundResult = { stop: RoundStop; toolCalls: ToolCall[] };

export type TextResult = { refused: true } | { refused: false; text: string };

export interface TurnConversation {
  /** One model call: yields the visible reply text as it streams, then returns how it stopped. */
  round(): AsyncGenerator<string, RoundResult>;
  /** Append the last round's output and our results for its tool calls, ready for the next round. */
  addToolResults(results: ToolResult[]): void;
}

export interface InterviewProvider {
  readonly id: ProviderId;
  readonly model: string;
  /** A streaming, tool-using conversation for one interview turn. `systemNote` is a trusted extra instruction (e.g. wrap up). */
  conversation(opts: { system: string[]; messages: ChatMessage[]; tools: ToolSpec[]; systemNote?: string }): TurnConversation;
  /** JSON matching `schema`, as text (the forced assessment). */
  structured(opts: { system: string[]; messages: ChatMessage[]; schema: Record<string, unknown> }): Promise<TextResult>;
  /** Plain text from a one-shot prompt (the transcript summary). */
  complete(opts: { system: string; user: string }): Promise<TextResult>;
}

export const PROVIDER_IDS = ["gemini", "anthropic"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
