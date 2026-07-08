import { defineArrayMember, defineField, defineType } from "sanity";

const lineFields = [
  defineField({ name: "kicker", title: "Kicker", type: "string" }),
  defineField({ name: "line1", title: "Line 1", type: "string" }),
  defineField({ name: "line2", title: "Line 2", type: "string" }),
];

const stringListField = defineField({
  name: "items",
  of: [defineArrayMember({ type: "string" })],
  title: "Bottom labels",
  type: "array",
  validation: (Rule) => Rule.max(4),
});

export const tandraIntroVideoType = defineType({
  description:
    "Editable copy and render output for the 30-second Remotion intro video.",
  fields: [
    defineField({
      description:
        "Toggle the subtitle overlay in the rendered video and preview.",
      initialValue: false,
      name: "showCaptions",
      title: "Show captions",
      type: "boolean",
    }),
    defineField({
      description:
        "Poster image shown before the Remotion player or rendered MP4 starts.",
      group: "media",
      name: "thumbnail",
      options: { hotspot: true },
      title: "Video thumbnail",
      type: "image",
    }),
    defineField({
      fields: [
        ...lineFields,
        defineField({
          name: "body",
          rows: 3,
          title: "Body copy",
          type: "text",
        }),
      ],
      group: "storm",
      name: "storm",
      title: "Opening storm scene",
      type: "object",
    }),
    defineField({
      fields: [
        ...lineFields,
        defineField({ name: "line3", title: "Line 3", type: "string" }),
        defineField({ name: "quote", rows: 2, title: "Quote", type: "text" }),
      ],
      group: "straightAnswers",
      name: "straightAnswers",
      title: "Straight answers scene",
      type: "object",
    }),
    defineField({
      fields: [
        ...lineFields,
        defineField({ name: "line3", title: "Line 3", type: "string" }),
        defineField({
          name: "body",
          rows: 3,
          title: "Body copy",
          type: "text",
        }),
      ],
      group: "inspection",
      name: "inspection",
      title: "Inspection scene",
      type: "object",
    }),
    defineField({
      fields: [
        ...lineFields,
        defineField({ name: "line3", title: "Line 3", type: "string" }),
        defineField({
          ...stringListField,
          title: "Process labels",
          validation: (Rule) => Rule.min(1).max(4),
        }),
      ],
      group: "managed",
      name: "managed",
      title: "Managed process scene",
      type: "object",
    }),
    defineField({
      fields: [
        ...lineFields,
        defineField({
          ...stringListField,
          title: "Service labels",
          validation: (Rule) => Rule.min(1).max(3),
        }),
      ],
      group: "proof",
      name: "proof",
      title: "Proof scene",
      type: "object",
    }),
    defineField({
      fields: [
        ...lineFields,
        defineField({ name: "cta", title: "Call to action", type: "string" }),
      ],
      group: "closing",
      name: "closing",
      title: "Closing scene",
      type: "object",
    }),
    defineField({
      description:
        "Set automatically after a Remotion render (POST /api/render-tandra-intro). The homepage plays this URL when present, instead of the Home page featured video upload.",
      group: "render",
      name: "renderedVideoUrl",
      readOnly: true,
      title: "Latest rendered video URL",
      type: "url",
    }),
    defineField({
      group: "render",
      name: "renderedAt",
      readOnly: true,
      title: "Last rendered",
      type: "datetime",
    }),
    defineField({
      description:
        "Used by the Sanity publish webhook to avoid re-rendering when only render metadata changes.",
      group: "render",
      hidden: true,
      name: "renderContentHash",
      readOnly: true,
      title: "Rendered content hash",
      type: "string",
    }),
    defineField({
      description:
        "Includes the deployed render bundle fingerprint so code/design changes can produce fresh video and poster output even when copy is unchanged.",
      group: "render",
      hidden: true,
      name: "renderArtifactHash",
      readOnly: true,
      title: "Rendered artifact hash",
      type: "string",
    }),
  ],
  groups: [
    { default: true, name: "storm", title: "Opening" },
    { name: "straightAnswers", title: "Straight answers" },
    { name: "inspection", title: "Inspection" },
    { name: "managed", title: "Managed process" },
    { name: "proof", title: "Proof" },
    { name: "closing", title: "Closing" },
    { name: "media", title: "Thumbnail" },
    { name: "render", title: "Render output" },
  ],
  initialValue: {
    closing: {
      cta: "Schedule a free consultation",
      kicker: "Tandra Peters · Austin roofing consultant",
      line1: "Your roof,",
      line2: "handled right.",
    },
    inspection: {
      body: "You get the real condition of your roof, what matters now, and what can wait.",
      kicker: "On your roof",
      line1: "I inspect.",
      line2: "I document.",
      line3: "I explain.",
    },
    managed: {
      items: [
        "Insurance claim guidance",
        "Scope and paperwork review",
        "Birdcreek Roofing crews",
        "Final walkthrough",
      ],
      kicker: "What homeowners need",
      line1: "One steady",
      line2: "point of contact",
      line3: "from first look to final walkthrough.",
    },
    proof: {
      items: ["Roof assessments", "Insurance help", "Project oversight"],
      kicker: "Built for Austin-area homeowners",
      line1: "Local roof know-how.",
      line2: "Backed by Birdcreek.",
    },
    storm: {
      body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
      kicker: "Austin homeowners",
      line1: "Texas roofs",
      line2: "take a beating.",
    },
    straightAnswers: {
      kicker: "Why Tandra?",
      line1: "Straight",
      line2: "answers.",
      line3: "No pressure.",
      quote: "If your roof just needs a repair, I'll tell you that.",
    },
  },
  name: "tandraIntroVideo",
  preview: {
    prepare: () => ({ title: "Tandra intro video" }),
  },
  title: "Tandra intro video",
  type: "object",
});
