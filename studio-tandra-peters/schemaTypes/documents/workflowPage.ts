import { defineField, defineType } from "sanity";

export const workflowPageType = defineType({
  name: "workflowPage",
  title: "Workflow page",
  type: "document",
  fields: [
    defineField({
      name: "pageTitle",
      title: "Page heading",
      type: "string",
      description: "Shown as the main H1 on /workflow.",
      initialValue: "Insurance Claim Workflow",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "pageLede",
      title: "Introduction",
      type: "text",
      rows: 4,
      description: "Short intro below the heading — first-person, as Tandra.",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "viewportZoom",
      title: "Initial zoom",
      type: "number",
      description: "Diagram zoom on first load (0.85 = 85%).",
      initialValue: 0.85,
      validation: (rule) => rule.min(0.35).max(1.1),
    }),
    defineField({
      name: "viewportAnchorX",
      title: "Viewport anchor X",
      type: "number",
      description: "Left inset when aligning step 1 on load (pixels).",
      initialValue: 60,
    }),
    defineField({
      name: "viewportAnchorY",
      title: "Viewport anchor Y",
      type: "number",
      description: "Top inset when aligning step 1 on load (pixels).",
      initialValue: 60,
    }),
    defineField({
      name: "layoutOriginX",
      title: "Layout origin X",
      type: "number",
      description: "Left offset for step 1 (pixels).",
      initialValue: 12,
    }),
    defineField({
      name: "layoutOriginY",
      title: "Layout origin Y",
      type: "number",
      description: "Top offset for step 1 (pixels).",
      initialValue: 12,
    }),
    defineField({
      name: "layoutNodeWidth",
      title: "Node width (layout)",
      type: "number",
      description:
        "Horizontal cell size used to place columns (pixels). Not the CSS card width.",
      initialValue: 496,
    }),
    defineField({
      name: "layoutNodeHeight",
      title: "Node height (layout)",
      type: "number",
      description: "Vertical cell size used to place rows (pixels).",
      initialValue: 232,
    }),
    defineField({
      name: "layoutColGap",
      title: "Column gap",
      type: "number",
      description: "Horizontal space between columns (pixels).",
      initialValue: 230,
    }),
    defineField({
      name: "layoutRowGap",
      title: "Row gap",
      type: "number",
      description: "Vertical space between rows (pixels).",
      initialValue: 40,
    }),
    defineField({
      name: "layoutFinalRowExtraOffset",
      title: "Final row extra offset",
      type: "number",
      description:
        "Extra vertical offset below row 3 for the wide final step (pixels).",
      initialValue: 24,
    }),
    defineField({
      name: "nodes",
      title: "Diagram steps",
      type: "array",
      of: [{ type: "workflowDiagramNode" }],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "edges",
      title: "Connections",
      type: "array",
      of: [{ type: "workflowDiagramEdge" }],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Insurance claim workflow" }),
  },
});
