import { defineField, defineType } from "sanity";

export const adCreativeVersionType = defineType({
  name: "adCreativeVersion",
  title: "Ad version",
  type: "document",
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
      title: "Saved by",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "config",
      title: "Creative configuration (JSON)",
      type: "text",
      rows: 12,
      description:
        "Serialized ad creative state. Edited from the Ad Builder, not here.",
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: "Saved (newest)",
      name: "savedAtDesc",
      by: [{ field: "savedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "name", subtitle: "savedAt" },
  },
});
