/**
 * Persistence for crew applications. Every read and write of the `crew`
 * dataset goes through here.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { getCrewClient } from "./sanityCrew";
import type {
  ApplicationStatus,
  Assessment,
  AuditEntry,
  CrewApplication,
  CvRecord,
  InterviewNote,
  Recommendation,
  TranscriptEntry,
} from "./types";
import type { StoredApplicant } from "./schema";

export const key = () => randomUUID().replace(/-/g, "").slice(0, 12);

/** Abandoned drafts are purged after this long; submitted ones after RETENTION. */
export const DRAFT_RETENTION_DAYS = 30;
export const RETENTION_MONTHS = 12;

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

const audit = (action: string, detail?: string, at = new Date()): AuditEntry => ({
  _key: key(),
  at: at.toISOString(),
  action,
  ...(detail ? { detail } : {}),
});

export async function createDraft(input: {
  applicant: StoredApplicant;
  passages: string[];
  ipHash: string;
  now?: Date;
}): Promise<string> {
  const now = input.now ?? new Date();
  const iso = now.toISOString();
  const doc: Omit<CrewApplication, "_id"> = {
    _type: "crewApplication",
    status: "draft",
    applicant: input.applicant,
    passages: input.passages,
    transcript: [],
    notes: [],
    audit: [audit("created", undefined, now)],
    consent: { privacyAt: iso, aiInterviewAt: iso, ipHash: input.ipHash },
    createdAt: iso,
    deleteAfter: addDays(now, DRAFT_RETENTION_DAYS).toISOString(),
  };
  const created = await getCrewClient().create(doc);
  return created._id;
}

export async function getApplication(id: string): Promise<CrewApplication | null> {
  return getCrewClient().getDocument<CrewApplication>(id).then((d) => d ?? null);
}

export async function attachCv(id: string, cv: CvRecord): Promise<void> {
  await getCrewClient()
    .patch(id)
    .set({ cv })
    .setIfMissing({ audit: [] })
    .append("audit", [audit("cv_attached", `${cv.fileName} (${cv.size} bytes)`)])
    .commit();
}

export async function appendTranscript(
  id: string,
  entries: Omit<TranscriptEntry, "_key">[],
  set: Partial<Pick<CrewApplication, "status" | "interviewStartedAt" | "transcriptSummary">> = {}
): Promise<void> {
  let patch = getCrewClient()
    .patch(id)
    .setIfMissing({ transcript: [] })
    .append(
      "transcript",
      entries.map((e) => ({ _key: key(), ...e }))
    );
  if (Object.keys(set).length) patch = patch.set(set);
  await patch.commit();
}

export async function appendNotes(id: string, notes: Omit<InterviewNote, "_key">[]): Promise<void> {
  if (!notes.length) return;
  await getCrewClient()
    .patch(id)
    .setIfMissing({ notes: [] })
    .append(
      "notes",
      notes.map((n) => ({ _key: key(), ...n }))
    )
    .commit();
}

/** Write the assessment and move the application to `submitted`. */
export async function submitWithAssessment(
  id: string,
  assessment: Assessment | null,
  now = new Date()
): Promise<void> {
  const set: Record<string, unknown> = {
    status: "submitted",
    submittedAt: now.toISOString(),
    deleteAfter: addMonths(now, RETENTION_MONTHS).toISOString(),
  };
  if (assessment) set.assessment = assessment;
  await getCrewClient()
    .patch(id)
    .set(set)
    .setIfMissing({ audit: [] })
    .append("audit", [
      audit(
        "submitted",
        assessment ? `assessment by ${assessment.finalisedBy ?? "model"}` : "interview disabled",
        now
      ),
    ])
    .commit();
}

export async function setStatus(id: string, status: ApplicationStatus, note?: string): Promise<void> {
  await getCrewClient()
    .patch(id)
    .set({ status })
    .setIfMissing({ audit: [] })
    .append("audit", [audit(`status:${status}`, note)])
    .commit();
}

export async function addOwnerNote(id: string, note: string): Promise<void> {
  const app = await getApplication(id);
  if (!app) throw new Error("Application not found");
  const stamp = new Date().toISOString().slice(0, 10);
  const ownerNotes = [app.ownerNotes, `[${stamp}] ${note}`].filter(Boolean).join("\n");
  await getCrewClient()
    .patch(id)
    .set({ ownerNotes })
    .setIfMissing({ audit: [] })
    .append("audit", [audit("owner_note")])
    .commit();
}

export type ListFilters = {
  passageId?: string;
  status?: ApplicationStatus;
  minScore?: number;
  recommendation?: Recommendation;
  since?: string;
};

export type ApplicationRow = {
  id: string;
  name: string;
  status: ApplicationStatus;
  passages: string[];
  weightedScore: number | null;
  recommendation: Recommendation | null;
  redFlagCount: number;
  offshoreMiles: number;
  submittedAt: string | null;
  createdAt: string;
};

export async function listApplications(filters: ListFilters = {}): Promise<ApplicationRow[]> {
  const conditions = ['_type == "crewApplication"'];
  const params: Record<string, unknown> = {};
  if (filters.passageId) {
    conditions.push("$passageId in passages");
    params.passageId = filters.passageId;
  }
  if (filters.status) {
    conditions.push("status == $status");
    params.status = filters.status;
  }
  if (typeof filters.minScore === "number") {
    conditions.push("assessment.weightedScore >= $minScore");
    params.minScore = filters.minScore;
  }
  if (filters.recommendation) {
    conditions.push("assessment.recommendation == $recommendation");
    params.recommendation = filters.recommendation;
  }
  if (filters.since) {
    conditions.push("createdAt >= $since");
    params.since = filters.since;
  }
  const query = `*[${conditions.join(" && ")}] | order(coalesce(assessment.weightedScore, 0) desc, createdAt desc)[0...200]{
    "id": _id,
    "name": applicant.fullName,
    status,
    passages,
    "weightedScore": assessment.weightedScore,
    "recommendation": assessment.recommendation,
    "redFlagCount": count(coalesce(assessment.redFlags, [])),
    "offshoreMiles": applicant.offshoreMiles,
    submittedAt,
    createdAt
  }`;
  return getCrewClient().fetch<ApplicationRow[]>(query, params);
}

export async function getApplications(ids: string[]): Promise<CrewApplication[]> {
  return getCrewClient().fetch<CrewApplication[]>(`*[_type == "crewApplication" && _id in $ids]`, { ids });
}

export async function listExpired(now = new Date()): Promise<{ _id: string; cvPathname?: string; cvUrl?: string }[]> {
  return getCrewClient().fetch(
    `*[_type == "crewApplication" && deleteAfter < $now][0...100]{ _id, "cvPathname": cv.pathname, "cvUrl": cv.blobUrl }`,
    { now: now.toISOString() }
  );
}

export async function deleteApplication(id: string): Promise<void> {
  await getCrewClient().delete(id);
}
