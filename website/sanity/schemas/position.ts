import { defineType, defineField } from "sanity";

export const position = defineType({
  name: "position",
  title: "Position Log",
  type: "document",
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
          { title: "SignalK", value: "signalk" },
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
    // Navigation data
    defineField({
      name: "navigation",
      title: "Navigation Data",
      type: "object",
      fields: [
        { name: "sog", title: "Speed Over Ground (kts)", type: "number" },
        { name: "heading", title: "True Heading (°)", type: "number" },
        { name: "tripLog", title: "Trip Log (nm)", type: "number" },
        { name: "depth", title: "Depth (m)", type: "number" },
      ],
    }),
    // Wind data
    defineField({
      name: "wind",
      title: "Wind Data",
      type: "object",
      fields: [
        { name: "apparentSpeed", title: "Apparent Wind Speed (kts)", type: "number" },
        { name: "apparentAngle", title: "Apparent Wind Angle (°)", type: "number" },
      ],
    }),
    // Environment data
    defineField({
      name: "environment",
      title: "Environment Data",
      type: "object",
      fields: [
        { name: "waterTemp", title: "Water Temperature (°C)", type: "number" },
        { name: "barometricPressure", title: "Barometric Pressure (hPa)", type: "number" },
      ],
    }),
    // Legacy weather field (kept for backwards compatibility)
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
