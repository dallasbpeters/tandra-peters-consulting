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
  fields: [
    defineField({
      description:
        'Short name shown in the left rail nav (e.g. "Ridge & ridge vent"). This is separate from Callout headline — update both if you rename a chapter.',
      name: "label",
      title: "Chapter label",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description: "Which side of the hotspot the detail card opens toward.",
      initialValue: "right",
      name: "direction",
      options: {
        layout: "radio",
        list: [
          { title: "Right →", value: "right" },
          { title: "Left ←", value: "left" },
          { title: "Up ↑", value: "top" },
          { title: "Down ↓", value: "bottom" },
        ],
      },
      title: "Callout direction",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description:
        "Bold heading inside the hotspot detail card only — not the left rail. The rail uses Chapter label above.",
      name: "calloutTitle",
      title: "Callout headline",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description: "Explanatory paragraph inside the detail card.",
      name: "calloutBody",
      rows: 4,
      title: "Callout body",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description:
        'Practical warning shown under "What to watch for" in the card.',
      name: "watchFor",
      rows: 3,
      title: "What to watch for",
      type: "text",
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
      description:
        "World-space X in metres (model-viewer). Publish Home page after editing. Draft coords only appear on the site with VITE_SANITY_API_READ_TOKEN or after publish.",
      name: "pos3dX",
      title: "Position X (m)",
      type: "number",
    }),
    defineField({
      description:
        "World-space Y in metres. Publish Home page after editing, or use Presentation preview for drafts.",
      name: "pos3dY",
      title: "Position Y (m)",
      type: "number",
    }),
    defineField({
      description:
        "World-space Z in metres. Publish Home page after editing, or use Presentation preview for drafts.",
      name: "pos3dZ",
      title: "Position Z (m)",
      type: "number",
    }),
    // ── 3D surface normal ─────────────────────────────────────────────────────
    defineField({
      description:
        "Surface normal X component (used to hide back-facing hotspots).",
      name: "norm3dX",
      title: "Normal X",
      type: "number",
    }),
    defineField({
      description: "Surface normal Y component.",
      name: "norm3dY",
      title: "Normal Y",
      type: "number",
    }),
    defineField({
      description: "Surface normal Z component.",
      name: "norm3dZ",
      title: "Normal Z",
      type: "number",
    }),
  ],
  name: "roofInspectionHotspot",
  preview: {
    prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
      return {
        subtitle: subtitle ?? "",
        title: title ?? "Unnamed hotspot",
      };
    },
    select: { subtitle: "calloutTitle", title: "label" },
  },
  title: "Inspection hotspot",
  type: "object",
});
