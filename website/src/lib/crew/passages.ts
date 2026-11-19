/**
 * Passages and interview scenarios live in the public production dataset —
 * they are published content, not applicant data — so the normal client is
 * the right one here.
 */
import { groq } from "next-sanity";
import { client } from "@/sanity/client";
import type { InterviewScenario, Passage } from "./types";

// Legs now carry plannedStart/plannedEnd; startDate/endDate are the pre-migration names.
const PASSAGE_FIELDS = `_id, title, "slug": slug.current, route, "startDate": coalesce(plannedStart, startDate), "endDate": coalesce(plannedEnd, endDate), nights, type, crewPlaces, status, minExperience, heroImage, "voyage": voyage->title`;

/** A leg is open for crew only when it's open AND has places (same rule as isOpenForCrew). */
export const OPEN_FOR_CREW_FILTER = `_type == "passage" && status == "open" && crewPlaces > 0 && !(_id in path("drafts.**"))`;

// /crew lists exactly the legs crew can apply for, and the form accepts the same set.
export const LISTED_PASSAGES_QUERY = groq`*[${OPEN_FOR_CREW_FILTER}]{ ${PASSAGE_FIELDS} } | order(startDate asc)`;
export const OPEN_PASSAGES_QUERY = LISTED_PASSAGES_QUERY;
export const PASSAGES_BY_ID_QUERY = groq`*[_type == "passage" && _id in $ids]{ ${PASSAGE_FIELDS} }`;
export const SCENARIOS_QUERY = groq`*[_type == "interviewScenario" && level == $level && count((passageTypes[])[@ in $types]) > 0 && !(_id in path("drafts.**"))]{ _id, prompt, passageTypes, level }`;

const noStore = { cache: "no-store" as const };

export async function listedPassages(): Promise<Passage[]> {
  return client.fetch<Passage[]>(LISTED_PASSAGES_QUERY, {}, noStore);
}

export async function openPassages(): Promise<Passage[]> {
  return client.fetch<Passage[]>(OPEN_PASSAGES_QUERY, {}, noStore);
}

export async function passagesById(ids: string[]): Promise<Passage[]> {
  if (!ids.length) return [];
  return client.fetch<Passage[]>(PASSAGES_BY_ID_QUERY, { ids }, noStore);
}

export async function scenariosFor(types: Passage["type"][], level: InterviewScenario["level"]): Promise<InterviewScenario[]> {
  if (!types.length) return [];
  return client.fetch<InterviewScenario[]>(SCENARIOS_QUERY, { types, level }, noStore);
}
