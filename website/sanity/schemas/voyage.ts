import { defineType, defineField } from "sanity";

export const voyage = defineType({
  name: "voyage",
  title: "Voyage",
  type: "document",
  icon: () => "⛵",
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
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "date",
    }),
    defineField({
      name: "endDate",
      title: "End Date",
      type: "date",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Planning", value: "planning" },
          { title: "Active", value: "active" },
          { title: "Completed", value: "completed" },
        ],
        layout: "radio",
      },
      initialValue: "planning",
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
  ],
  preview: {
    select: {
      title: "title",
      status: "status",
      media: "heroImage",
    },
    prepare({ title, status, media }) {
      return {
        title,
        subtitle: status ? status.charAt(0).toUpperCase() + status.slice(1) : "",
        media,
      };
    },
  },
});
