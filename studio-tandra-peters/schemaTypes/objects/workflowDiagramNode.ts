import { defineField, defineType } from "sanity";

export const workflowDiagramNodeType = defineType({
  name: "workflowDiagramNode",
  title: "Workflow diagram node",
  type: "object",
  fields: [
    defineField({
      name: "stepId",
      title: "Step ID",
      type: "string",
      description:
        'Stable ID used by connection lines (e.g. "1", "2"). Must match edge source/target.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "text",
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "wide",
      title: "Wide layout",
      type: "boolean",
      description: "Use the wider card style (e.g. final payment step).",
      initialValue: false,
    }),
    defineField({
      name: "subsections",
      title: "Subsections",
      type: "array",
      of: [{ type: "workflowDiagramNodeSubsection" }],
    }),
  ],
  preview: {
    select: { title: "title", stepId: "stepId" },
    prepare: ({ title, stepId }) => ({
      title: stepId ? `${stepId}. ${title || "Step"}` : title || "Workflow step",
    }),
  },
});
