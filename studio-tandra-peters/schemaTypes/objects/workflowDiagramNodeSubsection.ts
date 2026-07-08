import { defineField, defineType } from "sanity";

export const workflowDiagramNodeSubsectionType = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Subsection title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      rows: 3,
      title: "Subsection body",
      type: "text",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "workflowDiagramNodeSubsection",
  preview: {
    prepare: ({ title }) => ({ title: title || "Subsection" }),
    select: { title: "title" },
  },
  title: "Workflow node subsection",
  type: "object",
});
