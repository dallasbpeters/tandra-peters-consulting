import { defineField, defineType } from "sanity";

export const workflowDiagramNodeType = defineType({
  fields: [
    defineField({
      description:
        'Stable ID used by connection lines (e.g. "1", "2"). Must match edge source/target.',
      name: "stepId",
      title: "Step ID",
      type: "string",
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
      rows: 4,
      title: "Body",
      type: "text",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Use the wider card style (e.g. final payment step).",
      initialValue: false,
      name: "wide",
      title: "Wide layout",
      type: "boolean",
    }),
    defineField({
      description:
        "Optional manual X position (pixels) used by the on-page editor.",
      name: "posX",
      title: "Canvas position X",
      type: "number",
    }),
    defineField({
      description:
        "Optional manual Y position (pixels) used by the on-page editor.",
      name: "posY",
      title: "Canvas position Y",
      type: "number",
    }),
    defineField({
      name: "subsections",
      of: [{ type: "workflowDiagramNodeSubsection" }],
      title: "Subsections",
      type: "array",
    }),
  ],
  name: "workflowDiagramNode",
  preview: {
    prepare: ({ title, stepId }) => ({
      title: stepId
        ? `${stepId}. ${title || "Step"}`
        : title || "Workflow step",
    }),
    select: { stepId: "stepId", title: "title" },
  },
  title: "Workflow diagram node",
  type: "object",
});
