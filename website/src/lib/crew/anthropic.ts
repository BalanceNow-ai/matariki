import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const INTERVIEW_MODEL = "claude-sonnet-5-5";

let cached: Anthropic | null = null;

/** Reads ANTHROPIC_API_KEY from the environment. Tests replace this module. */
export function getAnthropic(): Anthropic {
  cached ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return cached;
}
