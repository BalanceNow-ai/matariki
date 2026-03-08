import { defineType, defineField } from "sanity";

export const video = defineType({
  name: "video",
  title: "Video",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "videoType",
      title: "Video Type",
      type: "string",
      options: {
        list: [
          { title: "YouTube", value: "youtube" },
          { title: "Vimeo", value: "vimeo" },
          { title: "Uploaded File", value: "file" },
        ],
        layout: "radio",
      },
      initialValue: "youtube",
    }),
    defineField({
      name: "youtubeUrl",
      title: "YouTube URL",
      type: "url",
      description: "Full YouTube video URL (e.g., https://www.youtube.com/watch?v=...)",
      hidden: ({ parent }) => parent?.videoType !== "youtube",
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo URL",
      type: "url",
      description: "Full Vimeo video URL",
      hidden: ({ parent }) => parent?.videoType !== "vimeo",
    }),
    defineField({
      name: "videoFile",
      title: "Video File",
      type: "file",
      options: {
        accept: "video/*",
      },
      hidden: ({ parent }) => parent?.videoType !== "file",
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail",
      type: "image",
      options: {
        hotspot: true,
      },
      description: "Custom thumbnail (optional - will use video thumbnail if not set)",
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
          { title: "Timelapse", value: "timelapse" },
          { title: "Documentary", value: "documentary" },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      description: "Feature this video prominently",
      initialValue: false,
    }),
    defineField({
      name: "duration",
      title: "Duration",
      type: "string",
      description: "e.g., 5:32 or 1:23:45",
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      media: "thumbnail",
    },
    prepare({ title, category, media }) {
      return {
        title,
        subtitle: category || "",
        media,
      };
    },
  },
});
