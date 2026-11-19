/** Claude (claude-sonnet-5-5) behind the interview provider interface. */
import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, INTERVIEW_MODEL } from "../../anthropic";
import type { ChatMessage, InterviewProvider, RoundResult, TextResult, ToolResult, ToolSpec, TurnConversation } from "./types";

export const TURN_MAX_TOKENS = 600;
const FINALISE_MAX_TOKENS = 3000;
const SUMMARY_MAX_TOKENS = 600;

/**
 * Thinking off for every call. On claude-sonnet-5-5, omitting `thinking`
 * means adaptive thinking (on) and `{ type: "disabled" }` is rejected, so
 * `between_tools` is the supported way to turn it off.
 */
const NO_THINKING: Anthropic.ThinkingConfigParam = { type: "between_tools" };

const systemBlocks = (system: string[]): Anthropic.TextBlockParam[] => system.map((text) => ({ type: "text", text }));

function toTools(tools: ToolSpec[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    strict: true,
    input_schema: t.schema as unknown as Anthropic.Tool["input_schema"],
  }));
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

class ClaudeConversation implements TurnConversation {
  private messages: Anthropic.MessageParam[];
  private last: Anthropic.Message | null = null;

  constructor(
    private readonly system: Anthropic.TextBlockParam[],
    messages: ChatMessage[],
    private readonly tools: Anthropic.Tool[],
    systemNote?: string
  ) {
    this.messages = [...messages];
    // Claude accepts a mid-conversation system message for trusted instructions.
    if (systemNote) this.messages.push({ role: "system", content: systemNote } as unknown as Anthropic.MessageParam);
  }

  async *round(): AsyncGenerator<string, RoundResult> {
    const stream = getAnthropic().messages.stream({
      model: INTERVIEW_MODEL,
      max_tokens: TURN_MAX_TOKENS,
      thinking: NO_THINKING,
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" },
      system: this.system,
      tools: this.tools,
      messages: this.messages,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) yield event.delta.text;
    }
    const reply = await stream.finalMessage();
    this.last = reply;
    const toolCalls = reply.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input }));
    const stop =
      reply.stop_reason === "refusal"
        ? "refusal"
        : reply.stop_reason === "tool_use" && toolCalls.length
          ? "tool_use"
          : reply.stop_reason === "max_tokens"
            ? "max_tokens"
            : "end";
    return { stop, toolCalls };
  }

  addToolResults(results: ToolResult[]): void {
    if (!this.last) return;
    this.messages.push({ role: "assistant", content: this.last.content });
    this.messages.push({
      role: "user",
      content: results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.id, content: r.content, ...(r.isError ? { is_error: true } : {}) })),
    });
  }
}

export const anthropicProvider: InterviewProvider = {
  id: "anthropic",
  model: INTERVIEW_MODEL,

  conversation({ system, messages, tools, systemNote }) {
    return new ClaudeConversation(systemBlocks(system), messages, toTools(tools), systemNote);
  },

  async structured({ system, messages, schema }): Promise<TextResult> {
    // claude-sonnet-5-5 rejects a forced tool_choice (any/tool) outright, with
    // or without thinking, so the "forced call" asks for structured output
    // against the same schema as the finalise_assessment tool instead.
    const res = await getAnthropic().messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: FINALISE_MAX_TOKENS,
      thinking: NO_THINKING,
      system: systemBlocks(system),
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      messages,
    });
    return res.stop_reason === "refusal" ? { refused: true } : { refused: false, text: textOf(res) };
  },

  async complete({ system, user }): Promise<TextResult> {
    const res = await getAnthropic().messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: SUMMARY_MAX_TOKENS,
      thinking: NO_THINKING,
      system,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: user }],
    });
    return res.stop_reason === "refusal" ? { refused: true } : { refused: false, text: textOf(res) };
  },
};
