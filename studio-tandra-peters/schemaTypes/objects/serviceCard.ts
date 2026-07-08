import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";
import { SERVICE_ICON_OPTIONS } from "../serviceIconMeta";

export const serviceCardType = defineType({
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
    defineField({
      initialValue: "search",
      name: "icon",
      options: {
        layout: "dropdown",
        list: [...SERVICE_ICON_OPTIONS],
      },
      title: "Icon (Iconoir)",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineGeneratedImage({
      description: "Optional card image (upload or AI).",
      name: "image",
      title: "Image",
    }),
  ],
  name: "serviceCard",
  title: "Service card",
  type: "object",
});
