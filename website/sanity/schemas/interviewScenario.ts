import { defineType, defineField } from "sanity";

export const interviewScenario = defineType({
  name: "interviewScenario",
  title: "Interview Scenario",
  type: "document",
  description: "A situation the AI crew interview may put to applicants. Applicants see the prompt text.",
  fields: [
    defineField({
      name: "prompt",
      title: "Scenario",
      type: "text",
      rows: 4,
      description: 'e.g. "You come on watch at 0200 and the wind has built to 30 knots with the full main up. What do you do?"',
      validation: (R) => R.required().min(20),
    }),
    defineField({
      name: "passageTypes",
      title: "Passage types",
      type: "array",
      of: [{ type: "string" }],
      options: { list: ["coastal", "offshore", "expedition"] },
      validation: (R) => R.required().min(1),
    }),
    defineField({
      name: "level",
      title: "Level",
      type: "string",
      options: { list: ["novice", "experienced"], layout: "radio" },
      validation: (R) => R.required(),
    }),
  ],
  preview: {
    select: { title: "prompt", level: "level" },
    prepare: ({ title, level }) => ({ title, subtitle: level }),
  },
});
