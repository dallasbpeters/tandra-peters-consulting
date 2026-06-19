import { defineField, defineType } from "sanity";

/**
 * roofInspectionHotspot — one interactive annotation point on the
 * RoofInspection diagram (The Inspection section).
 *
 * Positions are percentage strings so they stay relative to the diagram
 * image regardless of screen size (e.g. "14%", "25%").
 * The Roman numeral is derived from array order in the mapper — editors
 * don't need to manage it manually.
 */
export const roofInspectionHotspotType = defineType({
  name: "roofInspectionHotspot",
  title: "Inspection hotspot",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Chapter label",
      type: "string",
      description:
        'Short name shown in the left rail nav (e.g. "Ridge & ridge vent"). This is separate from Callout headline — update both if you rename a chapter.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "direction",
      title: "Callout direction",
      type: "string",
      description: "Which side of the hotspot the detail card opens toward.",
      options: {
        list: [
          { title: "Right →", value: "right" },
          { title: "Left ←", value: "left" },
          { title: "Up ↑", value: "top" },
          { title: "Down ↓", value: "bottom" },
        ],
        layout: "radio",
      },
      initialValue: "right",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "calloutTitle",
      title: "Callout headline",
      type: "string",
      description:
        "Bold heading inside the hotspot detail card only — not the left rail. The rail uses Chapter label above.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "calloutBody",
      title: "Callout body",
      type: "text",
      rows: 4,
      description: "Explanatory paragraph inside the detail card.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "watchFor",
      title: "What to watch for",
      type: "text",
      rows: 3,
      description:
        'Practical warning shown under "What to watch for" in the card.',
      validation: (Rule) => Rule.required(),
    }),
    // ── 3D position ──────────────────────────────────────────────────────────
    // World-space XYZ from model-viewer's surfaceFromPoint(). Units: metres.
    // To find values: open browser console on the 3D viewer and run:
    //   document.querySelector('#mv').addEventListener('click', e => {
    //     const h = e.currentTarget.surfaceFromPoint(e.clientX, e.clientY);
    //     if (h) console.log('pos', h.position.x, h.position.y, h.position.z,
    //                        'norm', h.normal.x, h.normal.y, h.normal.z);
    //   });
    defineField({
      name: "pos3dX",
      title: "Position X (m)",
      type: "number",
      description:
        "World-space X in metres (model-viewer). Publish Home page after editing. Draft coords only appear on the site with VITE_SANITY_API_READ_TOKEN or after publish.",
    }),
    defineField({
      name: "pos3dY",
      title: "Position Y (m)",
      type: "number",
      description:
        "World-space Y in metres. Publish Home page after editing, or use Presentation preview for drafts.",
    }),
    defineField({
      name: "pos3dZ",
      title: "Position Z (m)",
      type: "number",
      description:
        "World-space Z in metres. Publish Home page after editing, or use Presentation preview for drafts.",
    }),
    // ── 3D surface normal ─────────────────────────────────────────────────────
    defineField({
      name: "norm3dX",
      title: "Normal X",
      type: "number",
      description:
        "Surface normal X component (used to hide back-facing hotspots).",
    }),
    defineField({
      name: "norm3dY",
      title: "Normal Y",
      type: "number",
      description: "Surface normal Y component.",
    }),
    defineField({
      name: "norm3dZ",
      title: "Normal Z",
      type: "number",
      description: "Surface normal Z component.",
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "calloutTitle" },
    prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
      return {
        title: title ?? "Unnamed hotspot",
        subtitle: subtitle ?? "",
      };
    },
  },
});
