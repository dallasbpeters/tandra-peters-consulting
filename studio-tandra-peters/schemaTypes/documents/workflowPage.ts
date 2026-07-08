import { defineField, defineType } from "sanity";

export const workflowPageType = defineType({
  fields: [
    defineField({
      description: "Shown as the main H1 on /workflow.",
      initialValue: "Insurance Claim Workflow",
      name: "pageTitle",
      title: "Page heading",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Short intro below the heading — first-person, as Tandra.",
      name: "pageLede",
      rows: 4,
      title: "Introduction",
      type: "text",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      name: "seoDescription",
      rows: 3,
      title: "SEO description",
      type: "text",
    }),
    defineField({
      description: "Diagram zoom on first load (0.85 = 85%).",
      initialValue: 0.85,
      name: "viewportZoom",
      title: "Initial zoom",
      type: "number",
      validation: (rule) => rule.min(0.35).max(1.1),
    }),
    defineField({
      description: "Left inset when aligning step 1 on load (pixels).",
      initialValue: 60,
      name: "viewportAnchorX",
      title: "Viewport anchor X",
      type: "number",
    }),
    defineField({
      description: "Top inset when aligning step 1 on load (pixels).",
      initialValue: 60,
      name: "viewportAnchorY",
      title: "Viewport anchor Y",
      type: "number",
    }),
    defineField({
      description: "Left offset for step 1 (pixels).",
      initialValue: 12,
      name: "layoutOriginX",
      title: "Layout origin X",
      type: "number",
    }),
    defineField({
      description: "Top offset for step 1 (pixels).",
      initialValue: 12,
      name: "layoutOriginY",
      title: "Layout origin Y",
      type: "number",
    }),
    defineField({
      description:
        "Horizontal cell size used to place columns (pixels). Not the CSS card width.",
      initialValue: 496,
      name: "layoutNodeWidth",
      title: "Node width (layout)",
      type: "number",
    }),
    defineField({
      description: "Vertical cell size used to place rows (pixels).",
      initialValue: 232,
      name: "layoutNodeHeight",
      title: "Node height (layout)",
      type: "number",
    }),
    defineField({
      description: "Horizontal space between columns (pixels).",
      initialValue: 230,
      name: "layoutColGap",
      title: "Column gap",
      type: "number",
    }),
    defineField({
      description: "Vertical space between rows (pixels).",
      initialValue: 40,
      name: "layoutRowGap",
      title: "Row gap",
      type: "number",
    }),
    defineField({
      description:
        "Extra vertical offset below row 3 for the wide final step (pixels).",
      initialValue: 24,
      name: "layoutFinalRowExtraOffset",
      title: "Final row extra offset",
      type: "number",
    }),
    defineField({
      name: "nodes",
      of: [{ type: "workflowDiagramNode" }],
      title: "Diagram steps",
      type: "array",
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "edges",
      of: [{ type: "workflowDiagramEdge" }],
      title: "Connections",
      type: "array",
    }),
  ],
  name: "workflowPage",
  preview: {
    prepare: () => ({ title: "Insurance claim workflow" }),
  },
  title: "Workflow page",
  type: "document",
});
