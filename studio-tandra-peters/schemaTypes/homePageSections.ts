import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "./generatedImageField";

export const roofInspectionSectionType = defineType({
  name: "roofInspectionSection",
  title: "Roof Inspection",
  type: "object",
  description: 'The "The Inspection" interactive diagram section.',
  fields: [
    defineField({
      name: "kicker",
      title: "Kicker label",
      type: "string",
      description: "Small all-caps label above the title.",
      initialValue: "Tandra Peters · Roof Basics",
    }),
    defineField({
      name: "titleLine1",
      title: "Title — line 1 (plain)",
      type: "string",
      description: "First line of the section heading (roman weight).",
      initialValue: "The",
    }),
    defineField({
      name: "titleLine2",
      title: "Title — line 2 (italic accent)",
      type: "string",
      description: "Second line, rendered in italic accent style.",
      initialValue: "Inspection.",
    }),
    defineField({
      name: "subtitle",
      title: "Title — line 3 (plain)",
      type: "string",
      description:
        'Third line under the main heading in the left rail (e.g. "Seven things I check on every roof.").',
      initialValue: "Seven things I check on every roof.",
    }),
    defineField({
      name: "lede",
      title: "Lede",
      type: "text",
      rows: 3,
      description: "Short paragraph shown under the title.",
    }),
    defineGeneratedImage({
      name: "diagramImage",
      title: "Diagram image",
      description: "Roof cutaway illustration. Defaults to /roof-sidecut.svg when not set.",
    }),
    defineField({
      name: "hotspots",
      title: "Hotspots",
      type: "array",
      of: [{ type: "roofInspectionHotspot" }],
      description:
        "Interactive annotation points on the diagram. Leave empty to use built-in defaults.",
      validation: (Rule) => Rule.max(12),
    }),
  ],
});

export const heroSectionType = defineType({
  name: "heroSection",
  title: "Hero",
  type: "object",
  fields: [
    defineField({ name: "badge", type: "string", title: "Badge text" }),
    defineField({ name: "titleLine1", type: "string", title: "Title line 1" }),
    defineField({ name: "titleLine2", type: "string", title: "Title line 2 (muted accent)" }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "blockContent",
      description: "Supporting paragraph under the headline (bold, links, lists).",
    }),
    defineField({ name: "ctaText", type: "string" }),
    defineField({ name: "ctaHref", type: "string", initialValue: "#contact" }),
    defineField({ name: "secondaryCtaText", type: "string", initialValue: "Explore Services" }),
    defineField({ name: "secondaryCtaHref", type: "string", initialValue: "#services" }),
    defineGeneratedImage({
      name: "backgroundImage",
      title: "Background image",
      description:
        "Sanity image asset used by all hero variants (upload, Media Library, or Generate with AI).",
    }),
    defineGeneratedImage({
      name: "skyImage",
      title: "Sky image — Pill Nav background (parallax 0.3×)",
      description:
        "Wide sky/exterior photo used as the receding background layer in the Dark Floating Pill Nav variant. Scrolls slower than the page to create depth.",
    }),
    defineGeneratedImage({
      name: "foregroundImage",
      title: "House cutout — Pill Nav foreground (parallax −0.5×)",
      description:
        "Roof/house PNG cutout layered in front of the sky with inverse parallax — rises toward the viewer as the user scrolls. Only used by the Dark Floating Pill Nav variant.",
    }),
    defineField({
      name: "heroStyle",
      title: "Hero style override",
      type: "string",
      description:
        "Force a specific hero layout for CMS preview and QA. Leave blank to use the live PostHog A/B test (hero-banner-style flag).",
      options: {
        list: [
          { title: "— Use PostHog experiment (default) —", value: "" },
          { title: "Control — Original hero", value: "control" },
          {
            title: "Glass Overlay Nav — centered logo, transparent→glass nav",
            value: "glass-overlay",
          },
          { title: "Dual CTA Rail — opaque sticky rail with two CTAs", value: "dual-cta-rail" },
          {
            title: "Dark Floating Pill Nav — pill nav, full-bleed photo",
            value: "dark-floating-pill",
          },
        ],
        layout: "radio",
      },
      initialValue: "",
    }),
  ],
});
export const videoSectionType = defineType({
  name: "videoSection",
  title: "Video",
  type: "object",
  fields: [
    defineField({
      name: "video",
      type: "file",
      title: "Video upload",
      description: "Video file (upload, Media Library, or Generate with AI).",
      options: {
        accept: "video/*",
      },
    }),
    defineField({ name: "title", type: "string", title: "Title" }),
    defineField({
      name: "posterUrl",
      type: "image",
      title: "Poster image",
      description: "Sanity image asset (upload, Media Library, or Generate with AI).",
    }),
  ],
});

export const marqueeSectionType = defineType({
  name: "marqueeSection",
  title: "Scroll marquee",
  type: "object",
  fields: [
    defineField({
      name: "text",
      type: "text",
      rows: 2,
      description: "Single line of locations / ticker copy",
    }),
    defineField({
      name: "direction",
      type: "string",
      options: {
        list: [
          { title: "Right", value: "right" },
          { title: "Left", value: "left" },
        ],
      },
      initialValue: "right",
    }),
    defineField({ name: "velocity", type: "number", initialValue: 80 }),
  ],
});

export const aboutSectionType = defineType({
  name: "aboutSection",
  title: "About",
  type: "object",
  fields: [
    defineField({ name: "badgeText", type: "string" }),
    defineField({ name: "badgeSubtext", type: "string" }),
    defineGeneratedImage({
      name: "image",
      title: "Portrait / main image",
      description: "Sanity image asset (upload or AI).",
    }),
    defineField({ name: "titleLine1", type: "string" }),
    defineField({ name: "titleLine2", type: "string" }),
    defineField({
      name: "body",
      title: "Body",
      type: "blockContent",
      description: "Main copy (replaces legacy “paragraphs” list).",
    }),
  ],
});

export const statsSectionType = defineType({
  name: "statsSection",
  title: "Stats strip",
  type: "object",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Heading",
      description: "Short label shown beside the numbers (e.g. Birdcreek Roofing in Austin).",
    }),
    defineField({
      name: "items",
      title: "Stats",
      type: "array",
      of: [{ type: "statRow" }],
      validation: (rule) => rule.min(1).max(8),
    }),
  ],
});

export const servicesSectionType = defineType({
  name: "servicesSection",
  title: "Services",
  type: "object",
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({
      name: "titleLines",
      type: "array",
      of: [{ type: "string" }],
      validation: (rule) => rule.max(5),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "blockContent",
    }),
    defineField({
      name: "services",
      type: "array",
      of: [{ type: "serviceCard" }],
      validation: (rule) => rule.min(1).max(6),
    }),
    defineField({
      name: "birdcreekAdvantage",
      title: "Birdcreek advantage",
      type: "birdcreekAdvantageCard",
      description: "Large branded card shown beneath the services grid.",
    }),
    defineField({
      name: "servicesStyle",
      title: "Services layout override",
      type: "string",
      description:
        "Force a specific services layout for CMS preview and QA. Leave blank to use the live PostHog A/B test (services-section-style flag).",
      options: {
        list: [
          { title: "— Use PostHog experiment (default) —", value: "" },
          { title: "Control — Services grid", value: "control" },
          { title: "Typographic alt — full-bleed layout", value: "typographic-alt" },
        ],
        layout: "radio",
      },
      initialValue: "",
    }),
    defineField({
      name: "typographicArt",
      title: "Typographic layout headline art",
      type: "object",
      description:
        "Photos that fill the giant BIRDCREEK headline in the typographic-alt services layout. Base image shows through the full letterforms; overlay image appears in the circular patches.",
      fields: [
        defineGeneratedImage({
          name: "baseMaskImage",
          title: "Base mask image",
          description:
            "Full headline image fill (upload or AI). Defaults to /roof-2.jpg when empty.",
        }),
        defineGeneratedImage({
          name: "overlayMaskImage",
          title: "Overlay mask image",
          description:
            "Image revealed inside the circular patches on the headline. Defaults to /metal-roof.jpg when empty.",
        }),
      ],
    }),
  ],
});

export const missionSectionType = defineType({
  name: "missionSection",
  title: "Mission",
  type: "object",
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({
      name: "title",
      title: "Title",
      type: "blockContent",
      description:
        "Headline beside the tagline (use Normal style for a single line, or structure as needed).",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "blockContent",
    }),
    defineField({
      name: "values",
      type: "array",
      of: [{ type: "missionValue" }],
      validation: (rule) => rule.min(1).max(6),
    }),
  ],
});

export const expertiseSectionType = defineType({
  name: "expertiseSection",
  title: "Expertise",
  type: "object",
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({
      name: "items",
      type: "array",
      of: [{ type: "expertiseItem" }],
      validation: (rule) => rule.min(1),
    }),
  ],
});

export const testimonialsSectionType = defineType({
  name: "testimonialsSection",
  title: "Testimonials",
  type: "object",
  fields: [
    defineField({
      name: "elfsightWidgetId",
      type: "string",
      description: "Overrides VITE_ELFSIGHT_WIDGET_ID when set (UUID only)",
    }),
    defineField({
      name: "emptyStateNote",
      title: "Empty state note",
      type: "blockContent",
      description: "Optional copy when no widget id (usually leave empty).",
    }),
  ],
});

export const faqSectionType = defineType({
  name: "faqSection",
  title: "FAQ",
  type: "object",
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "blockContent",
    }),
    defineField({
      name: "items",
      type: "array",
      of: [{ type: "faqItem" }],
      validation: (rule) => rule.min(1),
    }),
  ],
});

export const contactSectionType = defineType({
  name: "contactSection",
  title: "Contact",
  type: "object",
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "location", type: "string" }),
  ],
});

export const socialShareSectionType = defineType({
  name: "socialShareSection",
  title: "Social share bar",
  type: "object",
  fields: [
    defineField({ name: "heading", type: "string" }),
    defineField({
      name: "shareText",
      title: "Share text",
      type: "blockContent",
      description:
        "Plain text is used for Twitter/email share strings (formatting is stripped for URLs).",
    }),
  ],
});

export const beforeAfterPairType = defineType({
  name: "beforeAfterPair",
  title: "Before / After Pair",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: 'Short label shown under the pair (e.g. "Hail damage repair, North Austin").',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "beforeImage",
      title: "Before image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "afterImage",
      title: "After image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
  ],
  preview: {
    select: { title: "title", media: "afterImage" },
    prepare: ({ title, media }) => ({
      title: title || "Before / After pair",
      media,
    }),
  },
});

export const beforeAfterSectionType = defineType({
  name: "beforeAfterSection",
  title: "Before / After",
  type: "object",
  description: "Image-pair slider. Add as many pairs as you like.",
  fields: [
    defineField({ name: "eyebrow", type: "string", title: "Eyebrow label" }),
    defineField({ name: "title", type: "string", title: "Heading" }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "blockContent",
      description: "Optional short paragraph beside the heading.",
    }),
    defineField({
      name: "items",
      title: "Image pairs",
      type: "array",
      of: [{ type: "beforeAfterPair" }],
      validation: (rule) => rule.unique(),
    }),
  ],
});

export const articlesTeaserSectionType = defineType({
  name: "articlesTeaserSection",
  title: "Articles teaser",
  type: "object",
  description:
    "Pick which articles appear as cards on the home page, or leave the list empty to use the newest posts automatically.",
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow label",
      initialValue: "Guides & insights",
    }),
    defineField({
      name: "title",
      type: "string",
      title: "Heading",
      initialValue: "Roofing articles",
    }),
    defineField({
      name: "intro",
      title: "Intro (right column)",
      type: "blockContent",
      description: "Short blurb beside the heading; links and bold allowed.",
    }),
    defineField({
      name: "viewAllLabel",
      type: "string",
      title: "“View all” link label",
      initialValue: "View all articles",
    }),
    defineField({
      name: "articles",
      title: "Articles on the home page",
      type: "array",
      description:
        "Add posts here to choose exactly what shows and in what order (drag to reorder). Leave empty to show the newest posts instead — then use the number field below.",
      of: [
        {
          type: "reference",
          to: [{ type: "post" }],
          options: {
            disableNew: true,
          },
        },
      ],
      validation: (rule) => rule.unique().max(50),
    }),
    defineField({
      name: "maxPosts",
      type: "number",
      title: "How many article cards",
      description:
        "Maximum cards on the home page — for both the picked list above and automatic newest posts when that list is empty.",
      initialValue: 8,
      validation: (rule) => rule.required().min(1).max(50).integer(),
    }),
    defineField({
      name: "enabled",
      type: "boolean",
      hidden: true,
      deprecated: {
        reason: "No longer used — the articles block is always shown when posts exist.",
      },
    }),
    defineField({
      name: "featuredPosts",
      type: "array",
      hidden: true,
      deprecated: { reason: "No longer used — remove when convenient (optional)." },
      of: [{ type: "reference", to: [{ type: "post" }] }],
    }),
  ],
});
