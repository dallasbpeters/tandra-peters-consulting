import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";

export const expertiseItemType = defineType({
  fields: [
    defineField({
      name: "id",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "desc",
      title: "Description",
      type: "blockContent",
      validation: (r) => r.required(),
    }),
    defineGeneratedImage({
      description: "Sanity image asset (upload or AI).",
      name: "image",
      title: "Image",
      validation: (r) => r.required(),
    }),
  ],
  name: "expertiseItem",
  title: "Expertise item",
  type: "object",
});
