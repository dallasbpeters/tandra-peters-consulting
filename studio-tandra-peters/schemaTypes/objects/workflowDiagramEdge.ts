import { defineField, defineType } from "sanity";

const handleOptions = [
  { title: "Top", value: "top" },
  { title: "Right", value: "right" },
  { title: "Bottom", value: "bottom" },
  { title: "Left", value: "left" },
] as const;

export const workflowDiagramEdgeType = defineType({
  name: "workflowDiagramEdge",
  title: "Workflow connection",
  type: "object",
  fields: [
    defineField({
      name: "edgeId",
      title: "Edge ID",
      type: "string",
      description: 'Stable connection id (e.g. "e1-2").',
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
      name: "sourceHandle",
      title: "Source handle",
      type: "string",
      options: { list: [...handleOptions], layout: "radio" },
      initialValue: "right",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "targetHandle",
      title: "Target handle",
      type: "string",
      options: { list: [...handleOptions], layout: "radio" },
      initialValue: "left",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "label",
      title: "Connection label",
      type: "string",
      description: "Short label on the arrow between steps.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      label: "label",
      sourceStep: "sourceStep",
      targetStep: "targetStep",
    },
    prepare: ({ label, sourceStep, targetStep }) => ({
      title: label || "Connection",
      subtitle:
        sourceStep && targetStep ? `${sourceStep} → ${targetStep}` : undefined,
    }),
  },
});
