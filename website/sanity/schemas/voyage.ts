import { defineType, defineField } from "sanity";

export const voyage = defineType({
  name: "voyage",
  title: "Voyage",
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
    defineField({
      name: "gallery",
      title: "Gallery",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "caption",
              title: "Caption",
              type: "string",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "waypoints",
      title: "Waypoints",
      type: "array",
      of: [
        {
          type: "object",
          name: "waypoint",
          title: "Waypoint",
          fields: [
            {
              name: "number",
              title: "Waypoint Number",
              type: "number",
              validation: (Rule) => Rule.required().integer().positive(),
            },
            {
              name: "name",
              title: "Name",
              type: "string",
            },
            {
              name: "latitude",
              title: "Latitude",
              type: "object",
              fields: [
                {
                  name: "degrees",
                  title: "Degrees",
                  type: "number",
                  validation: (Rule) => Rule.required().min(0).max(90).integer(),
                },
                {
                  name: "minutes",
                  title: "Minutes",
                  type: "number",
                  validation: (Rule) => Rule.required().min(0).max(59.9999).precision(4),
                },
                {
                  name: "direction",
                  title: "Direction",
                  type: "string",
                  options: {
                    list: [
                      { title: "North", value: "N" },
                      { title: "South", value: "S" },
                    ],
                    layout: "radio",
                  },
                  initialValue: "S",
                },
              ],
            },
            {
              name: "longitude",
              title: "Longitude",
              type: "object",
              fields: [
                {
                  name: "degrees",
                  title: "Degrees",
                  type: "number",
                  validation: (Rule) => Rule.required().min(0).max(180).integer(),
                },
                {
                  name: "minutes",
                  title: "Minutes",
                  type: "number",
                  validation: (Rule) => Rule.required().min(0).max(59.9999).precision(4),
                },
                {
                  name: "direction",
                  title: "Direction",
                  type: "string",
                  options: {
                    list: [
                      { title: "East", value: "E" },
                      { title: "West", value: "W" },
                    ],
                    layout: "radio",
                  },
                  initialValue: "E",
                },
              ],
            },
          ],
          preview: {
            select: {
              number: "number",
              name: "name",
              latDeg: "latitude.degrees",
              latMin: "latitude.minutes",
              latDir: "latitude.direction",
            },
            prepare({ number, name, latDeg, latMin, latDir }) {
              return {
                title: `WPT ${number}${name ? ` - ${name}` : ""}`,
                subtitle: latDeg ? `${latDeg}° ${latMin}' ${latDir}` : "",
              };
            },
          },
        },
      ],
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
