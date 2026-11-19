/**
 * Passages and interview scenarios live in the public production dataset —
 * they are published content, not applicant data — so the normal client is
 * the right one here.
 */
import { groq } from "next-sanity";
import { client } from "@/sanity/client";
import type { InterviewScenario, Passage } from "./types";

const PASSAGE_FIELDS = `_id, title, "slug": slug.current, route, startDate, endDate, nights, type, crewPlaces, status, minExperience, heroImage`;

export const LISTED_PASSAGES_QUERY = groq`*[_type == "passage" && status in ["open", "full"] && !(_id in path("drafts.**"))] | order(startDate asc){ ${PASSAGE_FIELDS} }`;
export const OPEN_PASSAGES_QUERY = groq`*[_type == "passage" && status == "open" && !(_id in path("drafts.**"))] | order(startDate asc){ ${PASSAGE_FIELDS} }`;
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
