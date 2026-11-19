import { defineType, defineField, defineArrayMember } from "sanity";
import { galleryMembers, waypointMember } from "./shared/fields";

/** routeGeoJson is optional; when present it must be JSON with a GeoJSON `type`. */
export function validateRouteGeoJson(value?: string): true | string {
  if (!value?.trim()) return true;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && typeof parsed.type === "string" ? true : "Must be a GeoJSON object";
  } catch {
    return "Not valid JSON";
  }
}

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
      name: "summary",
      title: "Summary",
      type: "string",
      description: "One line shown under the title and on voyage cards (max 200 characters).",
      validation: (Rule) => Rule.max(200),
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
      of: galleryMembers,
    }),
    defineField({
      name: "waypoints",
      title: "Waypoints (deprecated)",
      description:
        "Deprecated: add waypoints to each leg instead. Kept so existing voyage routes still show; new voyages should leave this empty.",
      type: "array",
      of: [
        waypointMember,
      ],
    }),
    defineField({
      name: "legs",
      title: "Legs",
      description: "The voyage's legs in sailing order. Drag to reorder. Only legs that belong to this voyage can be added.",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "passage" }],
          options: {
            filter: ({ document }) => ({
              filter: "voyage._ref == $voyageId",
              params: { voyageId: String(document._id).replace(/^drafts\./, "") },
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: "keyEvents",
      title: "Key events",
      description: "Regattas, festivals, crew changes and the like, shown as markers on the voyage timeline.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "keyEvent",
          title: "Key event",
          fields: [
            defineField({ name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "date", title: "Date", type: "date", validation: (Rule) => Rule.required() }),
            defineField({ name: "place", title: "Place", type: "string" }),
            defineField({ name: "url", title: "Link", type: "url" }),
          ],
          preview: {
            select: { title: "name", date: "date", place: "place" },
            prepare: ({ title, date, place }) => ({ title, subtitle: [date, place].filter(Boolean).join(" · ") }),
          },
        }),
      ],
    }),
    defineField({
      name: "routeGeoJson",
      title: "Route GeoJSON",
      description: "Optional. A GeoJSON LineString, MultiLineString, Feature or FeatureCollection for the overall planned route.",
      type: "text",
      rows: 6,
      validation: (Rule) => Rule.custom(validateRouteGeoJson),
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
