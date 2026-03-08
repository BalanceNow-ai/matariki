import { defineType, defineField } from "sanity";

export const crew = defineType({
  name: "crew",
  title: "Crew Member",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      description: "e.g., Captain, First Mate, Crew",
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Controls display order on the website. Lower numbers appear first (e.g., 1 = first, 2 = second).",
      initialValue: 10,
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 5,
    }),
  ],
  preview: {
    select: {
      title: "name",
      role: "role",
      order: "sortOrder",
      media: "photo",
    },
    prepare({ title, role, order, media }) {
      return {
        title,
        subtitle: `${role || "Crew"} • Order: ${order ?? "—"}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Sort Order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Name",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
  ],
});
