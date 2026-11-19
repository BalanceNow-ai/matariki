import { defineType, defineField } from "sanity";

export const passage = defineType({
  name: "passage",
  title: "Crew Passage",
  type: "document",
  description: "A leg crew can apply for on /crew.",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" }, validation: (R) => R.required() }),
    defineField({ name: "route", title: "Route", type: "string", description: "e.g. Auckland → Tonga" }),
    defineField({ name: "startDate", title: "Start date", type: "date", validation: (R) => R.required() }),
    defineField({ name: "endDate", title: "End date", type: "date" }),
    defineField({ name: "nights", title: "Nights", type: "number", validation: (R) => R.min(0).integer() }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: { list: ["coastal", "offshore", "expedition"], layout: "radio" },
      validation: (R) => R.required(),
    }),
    defineField({ name: "crewPlaces", title: "Crew places", type: "number", validation: (R) => R.min(0).integer() }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: ["open", "full", "closed"], layout: "radio" },
      initialValue: "open",
      description: "Open passages take applications. Full ones still show on the page.",
      validation: (R) => R.required(),
    }),
    defineField({ name: "minExperience", title: "Minimum experience", type: "text", rows: 3 }),
    defineField({ name: "heroImage", title: "Hero image", type: "image", options: { hotspot: true } }),
  ],
  preview: {
    select: { title: "title", status: "status", start: "startDate", media: "heroImage" },
    prepare: ({ title, status, start, media }) => ({ title, subtitle: `${status ?? "—"} · ${start ?? "no date"}`, media }),
  },
  orderings: [{ title: "Start date", name: "startAsc", by: [{ field: "startDate", direction: "asc" }] }],
});
