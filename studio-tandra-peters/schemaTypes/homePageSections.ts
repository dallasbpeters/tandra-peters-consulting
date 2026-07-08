import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "./generatedImageField";

export const roofInspectionSectionType = defineType({
  description: 'The "The Inspection" interactive diagram section.',
  fields: [
    defineField({
      description: "Small all-caps label above the title.",
      initialValue: "Tandra Peters · Roof Basics",
      name: "kicker",
      title: "Kicker label",
      type: "string",
    }),
    defineField({
      description: "First line of the section heading (roman weight).",
      initialValue: "The",
      name: "titleLine1",
      title: "Title — line 1 (plain)",
      type: "string",
    }),
    defineField({
      description: "Second line, rendered in italic accent style.",
      initialValue: "Inspection.",
      name: "titleLine2",
      title: "Title — line 2 (italic accent)",
      type: "string",
    }),
    defineField({
      description:
        'Third line under the main heading in the left rail (e.g. "Seven things I check on every roof.").',
      initialValue: "Seven things I check on every roof.",
      name: "subtitle",
      title: "Title — line 3 (plain)",
      type: "string",
    }),
    defineField({
      description: "Short paragraph shown under the title.",
      name: "lede",
      rows: 3,
      title: "Lede",
      type: "text",
    }),
    defineGeneratedImage({
      description:
        "Roof cutaway illustration. Defaults to /roof-sidecut.svg when not set.",
      name: "diagramImage",
      title: "Diagram image",
    }),
    defineField({
      description:
        "Interactive annotation points on the diagram. Leave empty to use built-in defaults.",
      name: "hotspots",
      of: [{ type: "roofInspectionHotspot" }],
      title: "Hotspots",
      type: "array",
      validation: (Rule) => Rule.max(12),
    }),
  ],
  name: "roofInspectionSection",
  title: "Roof Inspection",
  type: "object",
});

export const heroSectionType = defineType({
  fields: [
    defineField({ name: "badge", title: "Badge text", type: "string" }),
    defineField({ name: "titleLine1", title: "Title line 1", type: "string" }),
    defineField({
      name: "titleLine2",
      title: "Title line 2 (muted accent)",
      type: "string",
    }),
    defineField({
      description:
        "Supporting paragraph under the headline (bold, links, lists).",
      name: "subtitle",
      title: "Subtitle",
      type: "blockContent",
    }),
    defineField({ name: "ctaText", type: "string" }),
    defineField({ initialValue: "#contact", name: "ctaHref", type: "string" }),
    defineField({
      initialValue: "Explore Services",
      name: "secondaryCtaText",
      type: "string",
    }),
    defineField({
      initialValue: "#services",
      name: "secondaryCtaHref",
      type: "string",
    }),
    defineGeneratedImage({
      description:
        "Sanity image asset used by all hero variants (upload, Media Library, or Generate with AI).",
      name: "backgroundImage",
      title: "Background image",
    }),
    defineGeneratedImage({
      description:
        "Wide sky/exterior photo used as the receding background layer in the Dark Floating Pill Nav variant. Scrolls slower than the page to create depth.",
      name: "skyImage",
      title: "Sky image — Pill Nav background (parallax 0.3×)",
    }),
    defineGeneratedImage({
      description:
        "Roof/house PNG cutout layered in front of the sky with inverse parallax — rises toward the viewer as the user scrolls. Only used by the Dark Floating Pill Nav variant.",
      name: "foregroundImage",
      title: "House cutout — Pill Nav foreground (parallax −0.5×)",
    }),
    defineField({
      description:
        "Force a specific hero layout for CMS preview and QA. Leave blank to use the live PostHog A/B test (hero-banner-style flag).",
      initialValue: "",
      name: "heroStyle",
      options: {
        layout: "radio",
        list: [
          { title: "— Use PostHog experiment (default) —", value: "" },
          { title: "Control — Original hero", value: "control" },
          {
            title: "Glass Overlay Nav — centered logo, transparent→glass nav",
            value: "glass-overlay",
          },
          {
            title: "Dual CTA Rail — opaque sticky rail with two CTAs",
            value: "dual-cta-rail",
          },
          {
            title: "Dark Floating Pill Nav — pill nav, full-bleed photo",
            value: "dark-floating-pill",
          },
        ],
      },
      title: "Hero style override",
      type: "string",
    }),
  ],
  name: "heroSection",
  title: "Hero",
  type: "object",
});
export const videoSectionType = defineType({
  fields: [
    defineField({
      description: "Video file (upload, Media Library, or Generate with AI).",
      name: "video",
      options: {
        accept: "video/*",
      },
      title: "Video upload",
      type: "file",
    }),
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({
      description:
        "Sanity image asset (upload, Media Library, or Generate with AI).",
      name: "posterUrl",
      title: "Poster image",
      type: "image",
    }),
  ],
  name: "videoSection",
  title: "Video",
  type: "object",
});

export const birdcreekVideoBannerSectionType = defineType({
  fields: [
    defineField({
      description: "Vimeo link or player URL used by the embedded banner.",
      name: "vimeoUrl",
      title: "Vimeo URL",
      type: "url",
    }),
    defineField({
      description: "Optional heading shown above the video banner.",
      name: "title",
      title: "Title",
      type: "string",
    }),
  ],
  name: "birdcreekVideoBannerSection",
  preview: {
    prepare: ({ title }) => ({
      title: `Birdcreek video banner${title ? `: ${title}` : ""}`,
    }),
    select: { title: "title" },
  },
  title: "Birdcreek video banner",
  type: "object",
});

export const contactBannerSectionType = defineType({
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
    defineField({ name: "headline", title: "Headline", type: "string" }),
    defineField({ name: "phoneLabel", title: "Label", type: "string" }),
    defineField({
      name: "phoneDisplay",
      title: "Phone / button text",
      type: "string",
    }),
    defineField({
      name: "phoneTel",
      title: "Phone number (tel)",
      type: "string",
    }),
    defineField({ name: "phoneHref", title: "CTA href", type: "string" }),
    defineField({
      name: "phoneAriaLabel",
      title: "CTA aria label",
      type: "string",
    }),
    defineField({
      name: "ariaLabel",
      title: "Section aria label",
      type: "string",
    }),
    defineField({
      name: "ctaIcon",
      options: {
        providers: ["f7", "fa", "mdi", "sa", "hi", "fi", "si"],
      },
      title: "CTA icon",
      type: "iconPicker",
    }),
  ],
  name: "contactBannerSection",
  title: "Contact banner",
  type: "object",
});

export const certificationsSectionType = defineType({
  fields: [
    defineField({
      initialValue: "Certifications",
      name: "title",
      title: "Heading",
      type: "string",
    }),
  ],
  name: "certificationsSection",
  preview: {
    prepare: () => ({ title: "Certifications" }),
  },
  title: "Certifications",
  type: "object",
});

export const marqueeSectionType = defineType({
  fields: [
    defineField({
      description: "Single line of locations / ticker copy",
      name: "text",
      rows: 2,
      type: "text",
    }),
    defineField({
      initialValue: "right",
      name: "direction",
      options: {
        list: [
          { title: "Right", value: "right" },
          { title: "Left", value: "left" },
        ],
      },
      type: "string",
    }),
    defineField({ initialValue: 80, name: "velocity", type: "number" }),
  ],
  name: "marqueeSection",
  preview: {
    prepare: ({ title }) => ({
      title: `Marquee: ${title}`,
    }),
    select: { title: "text" },
  },
  title: "Scroll marquee",
  type: "object",
});

export const aboutSectionType = defineType({
  fields: [
    defineField({ name: "badgeText", type: "string" }),
    defineField({ name: "badgeSubtext", type: "string" }),
    defineGeneratedImage({
      description: "Sanity image asset (upload or AI).",
      name: "image",
      title: "Portrait / main image",
    }),
    defineField({ name: "titleLine1", type: "string" }),
    defineField({ name: "titleLine2", type: "string" }),
    defineField({
      description: "Main copy (replaces legacy “paragraphs” list).",
      name: "body",
      title: "Body",
      type: "blockContent",
    }),
  ],
  name: "aboutSection",
  preview: {
    prepare: ({ title, media }) => ({
      media,
      title: `About section: ${title}`,
    }),
    select: { media: "image", subtitle: "titleLine2", title: "titleLine1" },
  },
  title: "About",
  type: "object",
});

export const statsSectionType = defineType({
  fields: [
    defineField({
      description:
        "Short label shown beside the numbers (e.g. Birdcreek Roofing in Austin).",
      name: "title",
      title: "Heading",
      type: "string",
    }),
    defineField({
      name: "items",
      of: [{ type: "statRow" }],
      title: "Stats",
      type: "array",
      validation: (rule) => rule.min(1).max(8),
    }),
  ],
  name: "statsSection",
  preview: {
    prepare: ({ title, subtitle }) => ({
      subtitle: `${subtitle} stat rows`,
      title: `Stats strip: ${title}`,
    }),
    select: { subtitle: "items.length", title: "title" },
  },
  title: "Stats strip",
  type: "object",
});

export const servicesSectionType = defineType({
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({
      name: "titleLines",
      of: [{ type: "string" }],
      type: "array",
      validation: (rule) => rule.max(5),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "blockContent",
    }),
    defineField({
      name: "services",
      of: [{ type: "serviceCard" }],
      type: "array",
      validation: (rule) => rule.min(1).max(6),
    }),
    defineField({
      description: "Large branded card shown beneath the services grid.",
      name: "birdcreekAdvantage",
      title: "Birdcreek advantage",
      type: "birdcreekAdvantageCard",
    }),
    defineField({
      description:
        "Force a specific services layout for CMS preview and QA. Leave blank to use the live PostHog A/B test (services-section-style flag).",
      initialValue: "",
      name: "servicesStyle",
      options: {
        layout: "radio",
        list: [
          { title: "— Use PostHog experiment (default) —", value: "" },
          { title: "Control — Services grid", value: "control" },
          {
            title: "Typographic alt — full-bleed layout",
            value: "typographic-alt",
          },
        ],
      },
      title: "Services layout override",
      type: "string",
    }),
    defineField({
      description:
        "Photos that fill the giant BIRDCREEK headline in the typographic-alt services layout. Base image shows through the full letterforms; overlay image appears in the circular patches.",
      fields: [
        defineGeneratedImage({
          description:
            "Image revealed inside the circular patches on the headline. Defaults to /metal-roof.jpg when empty.",
          name: "overlayMaskImage",
          title: "Overlay mask image",
        }),
      ],
      name: "typographicArt",
      title: "Typographic layout headline art",
      type: "object",
    }),
  ],
  name: "servicesSection",
  preview: {
    prepare: () => ({
      title: "Services",
    }),
  },
  title: "Services",
  type: "object",
});

export const missionSectionType = defineType({
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({
      description:
        "Headline beside the tagline (use Normal style for a single line, or structure as needed).",
      name: "title",
      title: "Title",
      type: "blockContent",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "blockContent",
    }),
    defineField({
      name: "values",
      of: [{ type: "missionValue" }],
      type: "array",
      validation: (rule) => rule.min(1).max(6),
    }),
  ],
  name: "missionSection",
  title: "Mission",
  type: "object",
});

export const expertiseSectionType = defineType({
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({
      name: "items",
      of: [{ type: "expertiseItem" }],
      type: "array",
      validation: (rule) => rule.min(1),
    }),
  ],
  name: "expertiseSection",
  title: "Expertise",
  type: "object",
});

export const testimonialsSectionType = defineType({
  fields: [
    defineField({
      description: "Overrides VITE_ELFSIGHT_WIDGET_ID when set (UUID only)",
      name: "elfsightWidgetId",
      type: "string",
    }),
    defineField({
      description: "Optional copy when no widget id (usually leave empty).",
      name: "emptyStateNote",
      title: "Empty state note",
      type: "blockContent",
    }),
  ],
  name: "testimonialsSection",
  title: "Testimonials",
  type: "object",
});

export const faqSectionType = defineType({
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
      of: [{ type: "faqItem" }],
      type: "array",
      validation: (rule) => rule.min(1),
    }),
  ],
  name: "faqSection",
  title: "FAQ",
  type: "object",
});

export const contactSectionType = defineType({
  fields: [
    defineField({ name: "tagline", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "location", type: "string" }),
  ],
  name: "contactSection",
  title: "Contact",
  type: "object",
});

export const socialShareSectionType = defineType({
  fields: [
    defineField({ name: "heading", type: "string" }),
    defineField({
      description:
        "Plain text is used for Twitter/email share strings (formatting is stripped for URLs).",
      name: "shareText",
      title: "Share text",
      type: "blockContent",
    }),
  ],
  name: "socialShareSection",
  preview: {
    prepare: () => ({
      title: "Social share bar",
    }),
  },
  title: "Social share bar",
  type: "object",
});

export const beforeAfterPairType = defineType({
  fields: [
    defineField({
      description:
        'Short label shown under the pair (e.g. "Hail damage repair, North Austin").',
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "beforeImage",
      options: { hotspot: true },
      title: "Before image",
      type: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "afterImage",
      options: { hotspot: true },
      title: "After image",
      type: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      rows: 2,
      title: "Description",
      type: "text",
    }),
  ],
  name: "beforeAfterPair",
  preview: {
    prepare: ({ title, media }) => ({
      media,
      title: title || "Before / After pair",
    }),
    select: { media: "afterImage", title: "title" },
  },
  title: "Before / After Pair",
  type: "object",
});

export const beforeAfterSectionType = defineType({
  description: "Image-pair slider. Add as many pairs as you like.",
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow label", type: "string" }),
    defineField({ name: "title", title: "Heading", type: "string" }),
    defineField({
      description: "Optional short paragraph beside the heading.",
      name: "intro",
      title: "Intro",
      type: "blockContent",
    }),
    defineField({
      name: "items",
      of: [{ type: "beforeAfterPair" }],
      title: "Image pairs",
      type: "array",
      validation: (rule) => rule.unique(),
    }),
  ],
  name: "beforeAfterSection",
  title: "Before / After",
  type: "object",
});

export const articlesTeaserSectionType = defineType({
  description:
    "Pick which articles appear as cards on the home page, or leave the list empty to use the newest posts automatically.",
  fields: [
    defineField({
      initialValue: "Guides & insights",
      name: "eyebrow",
      title: "Eyebrow label",
      type: "string",
    }),
    defineField({
      initialValue: "Roofing articles",
      name: "title",
      title: "Heading",
      type: "string",
    }),
    defineField({
      description: "Short blurb beside the heading; links and bold allowed.",
      name: "intro",
      title: "Intro (right column)",
      type: "blockContent",
    }),
    defineField({
      initialValue: "View all articles",
      name: "viewAllLabel",
      title: "“View all” link label",
      type: "string",
    }),
    defineField({
      description:
        "Add posts here to choose exactly what shows and in what order (drag to reorder). Leave empty to show the newest posts instead — then use the number field below.",
      name: "articles",
      of: [
        {
          options: {
            disableNew: true,
          },
          to: [{ type: "post" }],
          type: "reference",
        },
      ],
      title: "Articles on the home page",
      type: "array",
      validation: (rule) => rule.unique().max(50),
    }),
    defineField({
      description:
        "Maximum cards on the home page — for both the picked list above and automatic newest posts when that list is empty.",
      initialValue: 8,
      name: "maxPosts",
      title: "How many article cards",
      type: "number",
      validation: (rule) => rule.required().min(1).max(50).integer(),
    }),
    defineField({
      deprecated: {
        reason:
          "No longer used — the articles block is always shown when posts exist.",
      },
      hidden: true,
      name: "enabled",
      type: "boolean",
    }),
    defineField({
      deprecated: {
        reason: "No longer used — remove when convenient (optional).",
      },
      hidden: true,
      name: "featuredPosts",
      of: [{ to: [{ type: "post" }], type: "reference" }],
      type: "array",
    }),
  ],
  name: "articlesTeaserSection",
  title: "Articles teaser",
  type: "object",
});
