import { defineField, defineType } from "sanity";

export const workflowDiagramNodeSubsectionType = defineType({
  name: "workflowDiagramNodeSubsection",
  title: "Workflow node subsection",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Subsection title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Subsection body",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare: ({ title }) => ({ title: title || "Subsection" }),
  },
});
