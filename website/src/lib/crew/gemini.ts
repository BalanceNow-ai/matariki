import "server-only";
import { GoogleGenAI } from "@google/genai";

/** Gemini 4 Argon (stable model ID). */
export const GEMINI_INTERVIEW_MODEL = "gemini-4-argon";

let cached: GoogleGenAI | null = null;

/** Reads GEMINI_API_KEY from the environment (server-only). Tests replace this module. */
export function getGemini(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  cached = new GoogleGenAI({ apiKey, httpOptions: { timeout: 55_000, retryOptions: { attempts: 2 } } });
  return cached;
}
