import { defineType, defineField } from "sanity";

export const position = defineType({
  name: "position",
  title: "Position Log",
  type: "document",
  icon: () => "📍",
  fields: [
    defineField({
      name: "coordinates",
      title: "Coordinates",
      type: "geopoint",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "timestamp",
      title: "Timestamp",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "voyage",
      title: "Voyage",
      type: "reference",
      to: [{ type: "voyage" }],
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      options: {
        list: [
          { title: "Iridium", value: "iridium" },
          { title: "AIS", value: "ais" },
          { title: "Manual", value: "manual" },
          { title: "SailLogger", value: "saillogger" },
        ],
      },
      initialValue: "manual",
    }),
    defineField({
      name: "locationName",
      title: "Location Name",
      type: "string",
      description: "Nearby place name (e.g., 'Mahurangi Harbour')",
    }),
    defineField({
      name: "weather",
      title: "Weather",
      type: "object",
      fields: [
        { name: "windSpeed", title: "Wind Speed (kts)", type: "number" },
        { name: "windDirection", title: "Wind Direction (°)", type: "number" },
        { name: "conditions", title: "Conditions", type: "string" },
      ],
    }),
  ],
  preview: {
    select: {
      location: "locationName",
      timestamp: "timestamp",
    },
    prepare({ location, timestamp }) {
      return {
        title: location || "Position",
        subtitle: timestamp ? new Date(timestamp).toLocaleString() : "",
      };
    },
  },
  orderings: [
    {
      title: "Date, New",
      name: "timestampDesc",
      by: [{ field: "timestamp", direction: "desc" }],
    },
  ],
});
