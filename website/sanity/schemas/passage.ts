import { defineType, defineField } from "sanity";
import { galleryMembers, waypointMember } from "./shared/fields";

/**
 * A leg of a voyage. The type is still named `passage` (and is what crew
 * apply for on /crew): a leg is open for crew when status is "open" and it
 * has crew places.
 */
export const LEG_KINDS = [
  { title: "Ocean passage", value: "oceanPassage" },
  { title: "Cruising ground", value: "cruisingGround" },
  { title: "Port stay", value: "portStay" },
] as const;

const afterStart = (startField: "plannedStart" | "actualStart") => (value: string | undefined, context: { document?: Record<string, unknown> }) => {
  const start = context.document?.[startField];
  if (!value || typeof start !== "string") return true;
  return value >= start ? true : "Can't be before the start date";
};

export const passage = defineType({
  name: "passage",
  title: "Crew Passage",
  type: "document",
  description: "A leg of a voyage. Open legs with crew places are listed on /crew.",
  groups: [
    { name: "leg", title: "Leg", default: true },
    { name: "route", title: "Route" },
    { name: "crew", title: "Crew" },
    { name: "media", title: "Media" },
  ],
  fields: [
    defineField({ name: "title", title: "Title", type: "string", group: "leg", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", group: "leg", options: { source: "title" }, validation: (R) => R.required() }),
    defineField({
      name: "voyage",
      title: "Voyage",
      type: "reference",
      to: [{ type: "voyage" }],
      group: "leg",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      group: "leg",
      description: "Position within the voyage (1 = first leg). The voyage's Legs list is the main ordering; this is the fallback.",
      validation: (R) => R.min(0).integer(),
    }),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      group: "leg",
      options: { list: [...LEG_KINDS], layout: "radio" },
    }),
    defineField({
      name: "type",
      title: "Crew passage type",
      type: "string",
      group: "crew",
      description: "Used to pick interview scenarios for applicants.",
      options: { list: ["coastal", "offshore", "expedition"], layout: "radio" },
      validation: (R) => R.required(),
    }),
    defineField({ name: "plannedStart", title: "Planned start", type: "date", group: "leg", validation: (R) => R.required() }),
    defineField({
      name: "plannedEnd",
      title: "Planned end",
      type: "date",
      group: "leg",
      validation: (R) => R.custom(afterStart("plannedStart")),
    }),
    defineField({ name: "actualStart", title: "Actual start", type: "date", group: "leg" }),
    defineField({
      name: "actualEnd",
      title: "Actual end",
      type: "date",
      group: "leg",
      validation: (R) => R.custom(afterStart("actualStart")),
    }),
    // Pre-legs fields. The migration script moves them into plannedStart/plannedEnd;
    // they stay defined (read-only, hidden once empty) so unmigrated documents still open cleanly.
    defineField({
      name: "startDate",
      title: "Start date (deprecated)",
      type: "date",
      group: "leg",
      readOnly: true,
      hidden: ({ value }) => !value,
      description: "Deprecated: replaced by Planned start. Run scripts/migrate-voyage-legs.ts to move it.",
    }),
    defineField({
      name: "endDate",
      title: "End date (deprecated)",
      type: "date",
      group: "leg",
      readOnly: true,
      hidden: ({ value }) => !value,
      description: "Deprecated: replaced by Planned end. Run scripts/migrate-voyage-legs.ts to move it.",
    }),
    defineField({ name: "nights", title: "Nights", type: "number", group: "leg", validation: (R) => R.min(0).integer() }),
    defineField({ name: "fromPlace", title: "From", type: "string", group: "route", description: "e.g. Opua" }),
    defineField({ name: "fromPoint", title: "From (map point)", type: "geopoint", group: "route" }),
    defineField({ name: "toPlace", title: "To", type: "string", group: "route", description: "e.g. Nuku'alofa" }),
    defineField({ name: "toPoint", title: "To (map point)", type: "geopoint", group: "route" }),
    defineField({ name: "route", title: "Route", type: "string", group: "route", description: "Short route label, e.g. Auckland → Tonga" }),
    defineField({ name: "plannedDistanceNm", title: "Planned distance (nm)", type: "number", group: "route", validation: (R) => R.min(0) }),
    defineField({ name: "actualDistanceNm", title: "Actual distance (nm)", type: "number", group: "route", validation: (R) => R.min(0) }),
    defineField({
      name: "waypoints",
      title: "Waypoints",
      type: "array",
      group: "route",
      description: "The leg's track, in order. Same format as voyage waypoints.",
      of: [waypointMember],
    }),
    defineField({ name: "crewPlaces", title: "Crew places", type: "number", group: "crew", validation: (R) => R.min(0).integer() }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "crew",
      options: { list: ["open", "full", "closed"], layout: "radio" },
      initialValue: "open",
      description: "Listed on /crew only when Open and Crew places is more than 0.",
      validation: (R) => R.required(),
    }),
    defineField({ name: "minExperience", title: "Minimum experience", type: "text", rows: 3, group: "crew" }),
    defineField({ name: "heroImage", title: "Hero image", type: "image", group: "media", options: { hotspot: true } }),
    defineField({ name: "gallery", title: "Gallery", type: "array", group: "media", of: galleryMembers }),
  ],
  preview: {
    select: { title: "title", order: "order", status: "status", start: "plannedStart", legacyStart: "startDate", voyage: "voyage.title", media: "heroImage" },
    prepare: ({ title, order, status, start, legacyStart, voyage, media }) => ({
      title: typeof order === "number" ? `${order}. ${title}` : title,
      subtitle: [voyage, status, start ?? legacyStart ?? "no date"].filter(Boolean).join(" · "),
      media,
    }),
  },
  orderings: [
    { title: "Leg order", name: "orderAsc", by: [{ field: "order", direction: "asc" }, { field: "plannedStart", direction: "asc" }] },
    { title: "Planned start", name: "plannedStartAsc", by: [{ field: "plannedStart", direction: "asc" }] },
  ],
});
