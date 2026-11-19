/**
 * Field shapes shared by voyages and their legs (the `passage` type), so a
 * leg's waypoints and gallery are exactly the same shape as a voyage's.
 */
import type { ArrayOfType } from "sanity";

/** One waypoint, in degrees and decimal minutes (unchanged from voyage.waypoints). */
export const waypointMember = {
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
} as ArrayOfType<"object">;

/** Gallery images with an optional caption (unchanged from voyage.gallery). */
export const galleryMembers = [
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
] as ArrayOfType<"image">[];
