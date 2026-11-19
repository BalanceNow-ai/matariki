/**
 * Rubric arithmetic. The model proposes 1–5 per dimension; the weighted
 * score is always computed here, never taken from the model.
 */
import { z } from "zod";
import { DIMENSIONS, RECOMMENDATIONS, type Assessment, type Dimension } from "./types";

export const WEIGHTS: Record<Dimension, number> = {
  seamanship: 0.3,
  offshoreRecord: 0.25,
  fitAboard: 0.2,
  skills: 0.15,
  availability: 0.1,
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  seamanship: "Seamanship and judgement",
  offshoreRecord: "Verified offshore record",
  fitAboard: "Fit with life aboard",
  skills: "Skills contribution",
  availability: "Availability match",
};

/** Round to the nearest whole score and keep it within 1–5. Garbage becomes 1. */
export function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function weightedScore(scores: Record<Dimension, { score: number }>): number {
  const total = DIMENSIONS.reduce((sum, d) => sum + clampScore(scores[d]?.score) * WEIGHTS[d], 0);
  return Math.round(total * 100) / 100;
}

const text = (max: number) => z.string().trim().max(max);

const dimensionScoreSchema = z.object({
  score: z.unknown().transform(clampScore),
  justification: text(600).default(""),
  evidence: z.array(text(400)).max(6).default([]),
});

export const finaliseInputSchema = z.object({
  scores: z.object(
    Object.fromEntries(DIMENSIONS.map((d) => [d, dimensionScoreSchema])) as Record<
      Dimension,
      typeof dimensionScoreSchema
    >
  ),
  recommendation: z.enum(RECOMMENDATIONS),
  redFlags: z.array(text(400)).max(10).default([]),
  inconsistencies: z.array(text(400)).max(10).default([]),
  callQuestions: z.array(text(400).min(1)).length(3, "Exactly three call questions"),
  summary: text(2000).min(1),
});

export type FinaliseInput = z.output<typeof finaliseInputSchema>;

export function truncateWords(s: string, maxWords: number): string {
  const words = s.trim().split(/\s+/);
  return words.length <= maxWords ? s.trim() : words.slice(0, maxWords).join(" ") + "…";
}

export function buildAssessment(
  input: FinaliseInput,
  extraRedFlags: string[] = [],
  finalisedBy: Assessment["finalisedBy"] = "model"
): Assessment {
  const redFlags = [...new Set([...extraRedFlags, ...input.redFlags])];
  return {
    scores: input.scores,
    weightedScore: weightedScore(input.scores),
    recommendation: input.recommendation,
    redFlags,
    inconsistencies: input.inconsistencies,
    callQuestions: input.callQuestions,
    summary: truncateWords(input.summary, 100),
    finalisedBy,
  };
}

/** JSON Schema for the finalise tool and the forced structured-output call. */
export const FINALISE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "recommendation", "redFlags", "inconsistencies", "callQuestions", "summary"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: [...DIMENSIONS],
      properties: Object.fromEntries(
        DIMENSIONS.map((d) => [
          d,
          {
            type: "object",
            additionalProperties: false,
            required: ["score", "justification", "evidence"],
            properties: {
              score: { type: "integer", enum: [1, 2, 3, 4, 5] },
              justification: { type: "string", description: "One or two sentences." },
              evidence: {
                type: "array",
                items: { type: "string" },
                description: "Short quotes or specifics from the form, CV or transcript.",
              },
            },
          },
        ])
      ),
    },
    recommendation: { type: "string", enum: [...RECOMMENDATIONS] },
    redFlags: { type: "array", items: { type: "string" } },
    inconsistencies: { type: "array", items: { type: "string" } },
    callQuestions: {
      type: "array",
      items: { type: "string" },
      description: "Exactly 3 questions for Greg to ask on the phone call.",
    },
    summary: { type: "string", description: "At most 100 words." },
  },
} as const;
