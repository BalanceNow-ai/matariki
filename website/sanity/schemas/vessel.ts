import { defineType, defineField } from "sanity";

export const vessel = defineType({
  name: "vessel",
  title: "Vessel",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Vessel Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      description: "e.g., Oyster 68",
    }),
    defineField({
      name: "designer",
      title: "Designer",
      type: "string",
    }),
    defineField({
      name: "builder",
      title: "Builder",
      type: "string",
    }),
    defineField({
      name: "year",
      title: "Year Built",
      type: "number",
    }),
    defineField({
      name: "flag",
      title: "Flag",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "dimensions",
      title: "Dimensions",
      type: "object",
      fields: [
        { name: "loa", title: "LOA (Length Overall)", type: "string" },
        { name: "lwl", title: "LWL (Waterline Length)", type: "string" },
        { name: "beam", title: "Beam", type: "string" },
        { name: "draft", title: "Draft", type: "string" },
        { name: "displacement", title: "Displacement", type: "string" },
        { name: "ballast", title: "Ballast", type: "string" },
      ],
    }),
    defineField({
      name: "rig",
      title: "Rig",
      type: "object",
      fields: [
        { name: "type", title: "Rig Type", type: "string" },
        { name: "mastHeight", title: "Mast Height", type: "string" },
        { name: "mainSail", title: "Main Sail", type: "string" },
        { name: "genoa", title: "Genoa", type: "string" },
      ],
    }),
    defineField({
      name: "engine",
      title: "Engine",
      type: "object",
      fields: [
        { name: "make", title: "Make", type: "string" },
        { name: "model", title: "Model", type: "string" },
        { name: "power", title: "Power", type: "string" },
      ],
    }),
    defineField({
      name: "tanks",
      title: "Tanks",
      type: "object",
      fields: [
        { name: "fuel", title: "Fuel Capacity", type: "string" },
        { name: "water", title: "Water Capacity", type: "string" },
        { name: "holding", title: "Holding Tank", type: "string" },
      ],
    }),
    defineField({
      name: "electronics",
      title: "Electronics",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "gallery",
      title: "Gallery Images",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [{ name: "caption", title: "Caption", type: "string" }],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "type",
      media: "heroImage",
    },
  },
});
