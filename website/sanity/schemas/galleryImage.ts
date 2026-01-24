import { defineType, defineField } from "sanity";

export const galleryImage = defineType({
  name: "galleryImage",
  title: "Gallery Image",
  type: "document",
  icon: () => "🖼️",
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: {
        hotspot: true,
        metadata: ["exif", "location"],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
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
          { title: "Wildlife", value: "wildlife" },
          { title: "Landscapes", value: "landscapes" },
          { title: "Yacht", value: "yacht" },
          { title: "People", value: "people" },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "takenAt",
      title: "Date Taken",
      type: "datetime",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description: "Show in homepage gallery preview",
      initialValue: false,
    }),
    defineField({
      name: "exif",
      title: "Camera Info",
      type: "object",
      fields: [
        { name: "camera", title: "Camera", type: "string" },
        { name: "lens", title: "Lens", type: "string" },
        { name: "aperture", title: "Aperture", type: "string" },
        { name: "shutter", title: "Shutter Speed", type: "string" },
        { name: "iso", title: "ISO", type: "string" },
      ],
    }),
  ],
  preview: {
    select: {
      caption: "caption",
      category: "category",
      media: "image",
    },
    prepare({ caption, category, media }) {
      return {
        title: caption || "Untitled",
        subtitle: category || "",
        media,
      };
    },
  },
  orderings: [
    {
      title: "Date Taken, New",
      name: "takenAtDesc",
      by: [{ field: "takenAt", direction: "desc" }],
    },
  ],
});
