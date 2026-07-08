import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";

export const missionValueType = defineType({
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
      name: "description",
      title: "Description",
      type: "blockContent",
      validation: (r) => r.required(),
    }),
    defineGeneratedImage({
      description: "Optional card background (upload or AI).",
      name: "image",
      title: "Background image",
    }),
  ],
  name: "missionValue",
  title: "Mission value",
  type: "object",
});
