/**
 * CREW_INTERVIEW_PROVIDER picks the interview model: "gemini" (default,
 * Gemini 4 Argon, needs GEMINI_API_KEY) or "anthropic" (claude-sonnet-5-5,
 * needs ANTHROPIC_API_KEY). An unknown value is an error rather than a
 * silent switch to some other model.
 */
import "server-only";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { PROVIDER_IDS, type InterviewProvider, type ProviderId } from "./types";

export function interviewProviderId(): ProviderId {
  const raw = process.env.CREW_INTERVIEW_PROVIDER?.trim().toLowerCase() || "gemini";
  if (!(PROVIDER_IDS as readonly string[]).includes(raw)) {
    throw new Error(`CREW_INTERVIEW_PROVIDER must be one of ${PROVIDER_IDS.join(", ")} (got "${raw}")`);
  }
  return raw as ProviderId;
}

export function getInterviewProvider(): InterviewProvider {
  return interviewProviderId() === "anthropic" ? anthropicProvider : geminiProvider;
}

export type * from "./types";
