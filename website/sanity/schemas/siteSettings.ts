import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "siteName",
      title: "Site Name",
      type: "string",
      initialValue: "Matariki III",
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      initialValue: "Oyster 68 Adventures",
    }),
    defineField({
      name: "description",
      title: "Site Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "currentVoyage",
      title: "Current Voyage",
      type: "reference",
      to: [{ type: "voyage" }],
    }),
    defineField({
      name: "currentPosition",
      title: "Current Position",
      type: "object",
      fields: [
        { name: "lat", title: "Latitude", type: "number" },
        { name: "lng", title: "Longitude", type: "number" },
        { name: "locationName", title: "Location Name", type: "string" },
        { name: "region", title: "Region", type: "string" },
        { name: "status", title: "Status", type: "string", options: {
          list: [
            { title: "At Anchor", value: "anchor" },
            { title: "Underway", value: "underway" },
            { title: "In Marina", value: "marina" },
            { title: "On the Hard", value: "hard" },
          ],
        }},
        { name: "updatedAt", title: "Last Updated", type: "datetime" },
      ],
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      fields: [
        { name: "instagram", title: "Instagram URL", type: "url" },
        { name: "youtube", title: "YouTube URL", type: "url" },
        { name: "facebook", title: "Facebook URL", type: "url" },
      ],
    }),
    defineField({
      name: "sailloggerUrl",
      title: "SailLogger URL",
      type: "url",
      description: "Your SailLogger tracking page URL",
      initialValue: "https://saillogger.com/svmatariki-iii",
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Site Settings",
      };
    },
  },
});
