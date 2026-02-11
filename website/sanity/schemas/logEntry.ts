import { defineType, defineField } from "sanity";

export const logEntry = defineType({
  name: "logEntry",
  title: "Log Entry",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "contentHtml",
      title: "Content HTML",
      type: "text",
      rows: 30,
      description: "Paste HTML content for the log entry",
    }),
    defineField({
      name: "voyage",
      title: "Voyage",
      type: "reference",
      to: [{ type: "voyage" }],
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Sailing", value: "sailing" },
          { title: "Hunting", value: "hunting" },
          { title: "Diving", value: "diving" },
          { title: "Fishing", value: "fishing" },
          { title: "General", value: "general" },
        ],
        layout: "dropdown",
      },
      initialValue: "general",
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "object",
      fields: [
        {
          name: "name",
          title: "Location Name",
          type: "string",
        },
        {
          name: "coordinates",
          title: "Coordinates",
          type: "geopoint",
        },
      ],
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "A brief summary for previews (2-3 sentences)",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      date: "publishedAt",
      media: "heroImage",
    },
    prepare({ title, category, date, media }) {
      return {
        title,
        subtitle: `${category || "General"} • ${date ? new Date(date).toLocaleDateString() : "Draft"}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Published Date, New",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
