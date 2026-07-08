import { defineField, defineType } from "sanity";

const handleOptions = [
  { title: "Top", value: "top" },
  { title: "Right", value: "right" },
  { title: "Bottom", value: "bottom" },
  { title: "Left", value: "left" },
] as const;

export const workflowDiagramEdgeType = defineType({
  fields: [
    defineField({
      description: 'Stable connection id (e.g. "e1-2").',
      name: "edgeId",
      title: "Edge ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sourceStep",
      title: "Source step ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "targetStep",
      title: "Target step ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: "right",
      name: "sourceHandle",
      options: { layout: "radio", list: [...handleOptions] },
      title: "Source handle",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: "left",
      name: "targetHandle",
      options: { layout: "radio", list: [...handleOptions] },
      title: "Target handle",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Short label on the arrow between steps.",
      name: "label",
      title: "Connection label",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "workflowDiagramEdge",
  preview: {
    prepare: ({ label, sourceStep, targetStep }) => ({
      subtitle:
        sourceStep && targetStep ? `${sourceStep} → ${targetStep}` : undefined,
      title: label || "Connection",
    }),
    select: {
      label: "label",
      sourceStep: "sourceStep",
      targetStep: "targetStep",
    },
  },
  title: "Workflow connection",
  type: "object",
});
