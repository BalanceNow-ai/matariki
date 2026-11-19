/**
 * Crew applications — PRIVATE `crew` dataset only. Never add this type to the
 * production schema. Documents are written by the server; the Studio view is
 * for reading and for Greg's status/notes.
 */
import { defineArrayMember, defineField, defineType } from "sanity";

const STATUSES = ["draft", "interviewing", "submitted", "shortlisted", "declined", "accepted", "withdrawn"];
const DIMENSIONS = ["seamanship", "offshoreRecord", "fitAboard", "skills", "availability"];

const strings = (name: string, title: string) =>
  defineField({ name, title, type: "array", of: [defineArrayMember({ type: "string" })] });

const dimensionScore = (name: string) =>
  defineField({
    name,
    type: "object",
    fields: [
      defineField({ name: "score", type: "number", validation: (R) => R.min(1).max(5) }),
      defineField({ name: "justification", type: "text", rows: 2 }),
      strings("evidence", "Evidence"),
    ],
  });

export const crewApplication = defineType({
  name: "crewApplication",
  title: "Crew Application",
  type: "document",
  fields: [
    defineField({ name: "status", type: "string", options: { list: STATUSES } }),
    defineField({
      name: "applicant",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "fullName", type: "string" }),
        defineField({ name: "email", type: "string" }),
        defineField({ name: "phone", type: "string" }),
        defineField({ name: "homeBase", type: "string" }),
        strings("nationality", "Nationality"),
        defineField({ name: "totalMiles", type: "number" }),
        defineField({ name: "offshoreMiles", type: "number" }),
        defineField({ name: "longestPassage", type: "text", rows: 2 }),
        defineField({ name: "nightWatches", type: "string" }),
        defineField({ name: "largestBoatFt", type: "number" }),
        strings("roles", "Roles"),
        strings("qualifications", "Qualifications"),
        defineField({ name: "otherQualifications", type: "string" }),
        strings("skills", "Skills"),
        strings("passages", "Passages (ids)"),
        defineField({ name: "availabilityNotes", type: "text", rows: 2 }),
        defineField({ name: "seasickness", type: "string" }),
        defineField({ name: "swimmer", type: "boolean" }),
        defineField({ name: "safetyNotes", type: "text", rows: 2 }),
        defineField({ name: "dietary", type: "string" }),
        defineField({ name: "catAllergy", type: "boolean" }),
        defineField({ name: "motivation", type: "text", rows: 5 }),
        defineField({
          name: "referees",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              fields: [
                defineField({ name: "name", type: "string" }),
                defineField({ name: "contact", type: "string" }),
                defineField({ name: "boat", type: "string" }),
                defineField({ name: "year", type: "string" }),
              ],
            }),
          ],
        }),
      ],
    }),
    strings("passages", "Passages (ids)"),
    defineField({
      name: "cv",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "blobUrl", type: "string" }),
        defineField({ name: "pathname", type: "string" }),
        defineField({ name: "fileName", type: "string" }),
        defineField({ name: "mime", type: "string" }),
        defineField({ name: "size", type: "number" }),
        defineField({ name: "extractedText", type: "text", rows: 10 }),
      ],
    }),
    defineField({
      name: "transcript",
      type: "array",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "role", type: "string" }),
            defineField({ name: "content", type: "text" }),
            defineField({ name: "ts", type: "datetime" }),
          ],
          preview: { select: { title: "content", subtitle: "role" } },
        }),
      ],
    }),
    defineField({
      name: "transcriptSummary",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "coversEntries", type: "number" }),
        defineField({ name: "text", type: "text" }),
      ],
    }),
    defineField({ name: "interviewStartedAt", type: "datetime", readOnly: true }),
    defineField({
      name: "notes",
      title: "Interview notes",
      type: "array",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "dimension", type: "string" }),
            defineField({ name: "note", type: "text" }),
            defineField({ name: "evidence", type: "text" }),
          ],
          preview: { select: { title: "note", subtitle: "dimension" } },
        }),
      ],
    }),
    defineField({
      name: "assessment",
      title: "AI assessment (advisory)",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "scores", type: "object", fields: DIMENSIONS.map(dimensionScore) }),
        defineField({ name: "weightedScore", type: "number" }),
        defineField({ name: "recommendation", type: "string" }),
        strings("redFlags", "Red flags"),
        strings("inconsistencies", "Inconsistencies"),
        strings("callQuestions", "Call questions"),
        defineField({ name: "summary", type: "text" }),
        defineField({ name: "finalisedBy", type: "string" }),
      ],
    }),
    defineField({ name: "ownerNotes", title: "Greg's notes", type: "text", rows: 6 }),
    defineField({
      name: "audit",
      type: "array",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "at", type: "datetime" }),
            defineField({ name: "action", type: "string" }),
            defineField({ name: "detail", type: "string" }),
          ],
          preview: { select: { title: "action", subtitle: "at" } },
        }),
      ],
    }),
    defineField({
      name: "consent",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "privacyAt", type: "datetime" }),
        defineField({ name: "aiInterviewAt", type: "datetime" }),
        defineField({ name: "ipHash", type: "string" }),
      ],
    }),
    defineField({ name: "createdAt", type: "datetime", readOnly: true }),
    defineField({ name: "submittedAt", type: "datetime", readOnly: true }),
    defineField({ name: "deleteAfter", type: "datetime", readOnly: true }),
  ],
  preview: {
    select: { name: "applicant.fullName", status: "status", score: "assessment.weightedScore", rec: "assessment.recommendation" },
    prepare: ({ name, status, score, rec }) => ({
      title: name ?? "(no name)",
      subtitle: [status, rec, typeof score === "number" ? `${score}/5` : null].filter(Boolean).join(" · "),
    }),
  },
  orderings: [
    { title: "Newest", name: "createdDesc", by: [{ field: "createdAt", direction: "desc" }] },
    { title: "Score", name: "scoreDesc", by: [{ field: "assessment.weightedScore", direction: "desc" }] },
  ],
});
