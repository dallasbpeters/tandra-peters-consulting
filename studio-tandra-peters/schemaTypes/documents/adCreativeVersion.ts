import { defineField, defineType } from "sanity";

export const adCreativeVersionType = defineType({
  fields: [
    defineField({
      name: "name",
      title: "Version name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "savedAt",
      title: "Saved at",
      type: "datetime",
    }),
    defineField({
      name: "savedBy",
      readOnly: true,
      title: "Saved by",
      type: "string",
    }),
    defineField({
      description:
        "Serialized ad creative state. Edited from the Ad Builder, not here.",
      name: "config",
      rows: 12,
      title: "Creative configuration (JSON)",
      type: "text",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Base64 preview thumbnail captured at save time.",
      hidden: true,
      name: "thumbnail",
      title: "Thumbnail",
      type: "text",
    }),
  ],
  name: "adCreativeVersion",
  orderings: [
    {
      by: [{ direction: "desc", field: "savedAt" }],
      name: "savedAtDesc",
      title: "Saved (newest)",
    },
  ],
  preview: {
    select: { subtitle: "savedAt", title: "name" },
  },
  title: "Ad version",
  type: "document",
});
