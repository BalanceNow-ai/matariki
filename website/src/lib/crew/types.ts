import type { StoredApplicant } from "./schema";

export const APPLICATION_STATUSES = [
  "draft",
  "interviewing",
  "submitted",
  "shortlisted",
  "declined",
  "accepted",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DIMENSIONS = [
  "seamanship",
  "offshoreRecord",
  "fitAboard",
  "skills",
  "availability",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const RECOMMENDATIONS = ["strong", "possible", "unlikely"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export type DimensionScore = { score: number; justification: string; evidence: string[] };

export type Assessment = {
  scores: Record<Dimension, DimensionScore>;
  weightedScore: number;
  recommendation: Recommendation;
  redFlags: string[];
  inconsistencies: string[];
  callQuestions: string[];
  summary: string;
  /** Whether the model called finalise itself or the server forced it at a cap. */
  finalisedBy?: "model" | "forced";
};

export type TranscriptEntry = {
  _key: string;
  role: "applicant" | "assistant";
  content: string;
  ts: string;
};

export type InterviewNote = {
  _key: string;
  dimension: Dimension | "general";
  note: string;
  evidence: string;
};

export type AuditEntry = { _key: string; at: string; action: string; detail?: string };

export type CvRecord = {
  blobUrl: string;
  pathname: string;
  fileName: string;
  mime: string;
  size: number;
  extractedText: string;
};

export type CrewApplication = {
  _id: string;
  _type: "crewApplication";
  status: ApplicationStatus;
  applicant: StoredApplicant;
  passages: string[];
  cv?: CvRecord;
  transcript?: TranscriptEntry[];
  /** Model-written digest of older turns, used to keep the prompt small. */
  transcriptSummary?: { coversEntries: number; text: string };
  interviewStartedAt?: string;
  notes?: InterviewNote[];
  assessment?: Assessment;
  /**
   * Flags raised by the system rather than the model's assessment, e.g.
   * "model refusal during interview". Kept even when there is no assessment.
   */
  redFlags?: string[];
  ownerNotes?: string;
  audit?: AuditEntry[];
  consent: { privacyAt: string; aiInterviewAt: string; ipHash: string };
  createdAt: string;
  submittedAt?: string;
  deleteAfter: string;
};

/** Passage as published in the production dataset. */
export type Passage = {
  _id: string;
  title: string;
  slug?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  nights?: number;
  type: "coastal" | "offshore" | "expedition";
  crewPlaces?: number;
  status: "open" | "full" | "closed";
  minExperience?: string;
  heroImage?: unknown;
};

export type InterviewScenario = {
  _id: string;
  prompt: string;
  passageTypes: Passage["type"][];
  level: "novice" | "experienced";
};
