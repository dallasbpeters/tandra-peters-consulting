import { defineField, defineType } from "sanity";

/**
 * estimatorPage — singleton for the standalone "rough cost" estimator at /estimate.
 *
 * A multi-step wizard. Tandra configures the questions, the answer options, and
 * the pricing knobs entirely here. The frontend always presents the result as a
 * RANGE ("here's roughly what you'll spend"), never a single number, because a
 * real quote varies with materials, pitch, access, and deck condition.
 *
 * The homepage links here via a CTA banner whose copy is set in the "Homepage
 * banner" group below.
 *
 * How the math works (see estimatorOption for per-field detail):
 *   homeSqft    = sqftMidpoint of the selected option on the question marked
 *                 "Drives square footage"
 *   ratePerSqft = baseRatePerSqft + Σ(selected options' pricePerSqftAdd)
 *   subtotal    = homeSqft × ratePerSqft + baseFee + Σ(selected flatAdd)
 *   low / high  = subtotal × (1 − rangeSpread) / subtotal × (1 + rangeSpread)
 */
export const estimatorPageType = defineType({
  fields: [
    defineField({
      description: 'Small text above the title, e.g. "Ballpark Pricing".',
      group: "content",
      name: "eyebrow",
      title: "Eyebrow label",
      type: "string",
    }),
    defineField({
      description: 'Page heading, e.g. "What might my roof cost?"',
      group: "content",
      name: "title",
      title: "Title",
      type: "string",
    }),
    defineField({
      description:
        "Optional sentence beneath the heading, before the wizard starts.",
      group: "content",
      name: "description",
      rows: 3,
      title: "Intro",
      type: "text",
    }),
    defineField({
      group: "content",
      initialValue: "Estimate my roof",
      name: "startButtonLabel",
      title: "Start button label",
      type: "string",
    }),
    defineField({
      description:
        "Headline shown above the price range on the results screen.",
      group: "content",
      initialValue: "Here's roughly what you'll spend",
      name: "resultHeading",
      title: "Result heading",
      type: "string",
    }),
    defineField({
      description:
        "Shown under the price range to set expectations. Always reinforce that it's a range.",
      group: "content",
      initialValue:
        "This is a rough ballpark only. Every roof is different—your real quote depends on materials, pitch, access, and the condition of the deck once we get up there.",
      name: "disclaimer",
      rows: 3,
      title: "Disclaimer",
      type: "text",
    }),
    defineField({
      description:
        'One step per question. Mark exactly one question "Drives square footage" (usually home size).',
      group: "questions",
      name: "questions",
      of: [{ type: "estimatorQuestion" }],
      title: "Questions",
      type: "array",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      description:
        "Flat amount added to every estimate (e.g. mobilization / minimum job cost).",
      group: "pricing",
      initialValue: 0,
      name: "baseFee",
      title: "Base fee ($)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      description:
        "Starting price per square foot before any option modifiers. Material/scope options add to this.",
      group: "pricing",
      initialValue: 0,
      name: "baseRatePerSqft",
      title: "Base rate ($ per sq ft)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      description:
        "How wide the shown range is around the computed subtotal. 15 = show ±15% (e.g. $8,500 – $11,500). Keeps the output a range, never one number.",
      group: "pricing",
      initialValue: 15,
      name: "rangeSpreadPercent",
      title: "Range spread (%)",
      type: "number",
      validation: (Rule) => Rule.required().min(0).max(60),
    }),
    defineField({
      group: "pricing",
      initialValue: "$",
      name: "currency",
      title: "Currency symbol",
      type: "string",
    }),
    defineField({
      description: "Small text on the homepage CTA banner that links here.",
      group: "banner",
      initialValue: "Ballpark Pricing · 60 Seconds",
      name: "bannerEyebrow",
      title: "Banner eyebrow",
      type: "string",
    }),
    defineField({
      group: "banner",
      initialValue: "Estimate Your Roof",
      name: "bannerHeadline",
      title: "Banner headline",
      type: "string",
    }),
    defineField({
      group: "banner",
      initialValue: "Start estimate",
      name: "bannerCtaLabel",
      title: "Banner button label",
      type: "string",
    }),
    defineField({
      description:
        "Browser tab title. Falls back to a built-in default when empty.",
      group: "seo",
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      description: "Meta description for search and social previews.",
      group: "seo",
      name: "seoDescription",
      rows: 3,
      title: "SEO description",
      type: "text",
    }),
  ],
  groups: [
    { default: true, name: "content", title: "Content" },
    { name: "questions", title: "Questions" },
    { name: "pricing", title: "Pricing" },
    { name: "banner", title: "Homepage banner" },
    { name: "seo", title: "SEO" },
  ],
  name: "estimatorPage",
  preview: {
    prepare: () => ({ title: "Estimator page" }),
  },
  title: "Estimator page",
  type: "document",
});
