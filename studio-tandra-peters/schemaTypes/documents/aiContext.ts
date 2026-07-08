import { defineArrayMember, defineField, defineType } from "sanity";

export const aiContextType = defineType({
  fields: [
    defineField({
      initialValue: "AI Context",
      name: "title",
      readOnly: true,
      type: "string",
    }),
    defineField({
      description:
        "High-level guidance the dashboard AI should follow when generating recommendations.",
      name: "instructions",
      rows: 8,
      title: "Core instructions",
      type: "text",
    }),
    defineField({
      name: "businessPriorities",
      of: [defineArrayMember({ type: "string" })],
      options: { sortable: true },
      title: "Business priorities",
      type: "array",
    }),
    defineField({
      description: "Things the AI should avoid or rules it must respect.",
      name: "guardrails",
      of: [defineArrayMember({ type: "string" })],
      options: { sortable: true },
      title: "Guardrails",
      type: "array",
    }),
    defineField({
      name: "targetKeywords",
      of: [defineArrayMember({ type: "string" })],
      options: { sortable: true },
      title: "Target keywords",
      type: "array",
    }),
    defineField({
      description:
        "Important pages or routes the AI should favor when suggesting internal links.",
      name: "preferredInternalLinks",
      of: [defineArrayMember({ type: "string" })],
      options: { sortable: true },
      title: "Preferred internal links",
      type: "array",
    }),
  ],
  name: "aiContext",
  preview: {
    prepare({ title, subtitle }) {
      return {
        subtitle: subtitle ? subtitle.slice(0, 80) : "No AI guidance added yet",
        title: title || "AI Context",
      };
    },
    select: {
      subtitle: "instructions",
      title: "title",
    },
  },
  title: "AI context",
  type: "document",
});
