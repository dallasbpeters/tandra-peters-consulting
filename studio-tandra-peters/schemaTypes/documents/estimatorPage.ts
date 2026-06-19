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
  name: "estimatorPage",
  title: "Estimator page",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "questions", title: "Questions" },
    { name: "pricing", title: "Pricing" },
    { name: "banner", title: "Homepage banner" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "eyebrow",
      title: "Eyebrow label",
      type: "string",
      group: "content",
      description: 'Small text above the title, e.g. "Ballpark Pricing".',
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      description: 'Page heading, e.g. "What might my roof cost?"',
    }),
    defineField({
      name: "description",
      title: "Intro",
      type: "text",
      rows: 3,
      group: "content",
      description:
        "Optional sentence beneath the heading, before the wizard starts.",
    }),
    defineField({
      name: "startButtonLabel",
      title: "Start button label",
      type: "string",
      initialValue: "Estimate my roof",
      group: "content",
    }),
    defineField({
      name: "resultHeading",
      title: "Result heading",
      type: "string",
      initialValue: "Here's roughly what you'll spend",
      group: "content",
      description:
        "Headline shown above the price range on the results screen.",
    }),
    defineField({
      name: "disclaimer",
      title: "Disclaimer",
      type: "text",
      rows: 3,
      group: "content",
      initialValue:
        "This is a rough ballpark only. Every roof is different—your real quote depends on materials, pitch, access, and the condition of the deck once we get up there.",
      description:
        "Shown under the price range to set expectations. Always reinforce that it's a range.",
    }),
    defineField({
      name: "questions",
      title: "Questions",
      type: "array",
      group: "questions",
      of: [{ type: "estimatorQuestion" }],
      validation: (Rule) => Rule.required().min(1),
      description:
        'One step per question. Mark exactly one question "Drives square footage" (usually home size).',
    }),
    defineField({
      name: "baseFee",
      title: "Base fee ($)",
      type: "number",
      initialValue: 0,
      group: "pricing",
      description:
        "Flat amount added to every estimate (e.g. mobilization / minimum job cost).",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "baseRatePerSqft",
      title: "Base rate ($ per sq ft)",
      type: "number",
      initialValue: 0,
      group: "pricing",
      description:
        "Starting price per square foot before any option modifiers. Material/scope options add to this.",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "rangeSpreadPercent",
      title: "Range spread (%)",
      type: "number",
      initialValue: 15,
      group: "pricing",
      description:
        "How wide the shown range is around the computed subtotal. 15 = show ±15% (e.g. $8,500 – $11,500). Keeps the output a range, never one number.",
      validation: (Rule) => Rule.required().min(0).max(60),
    }),
    defineField({
      name: "currency",
      title: "Currency symbol",
      type: "string",
      initialValue: "$",
      group: "pricing",
    }),
    defineField({
      name: "bannerEyebrow",
      title: "Banner eyebrow",
      type: "string",
      initialValue: "Ballpark Pricing · 60 Seconds",
      group: "banner",
      description: "Small text on the homepage CTA banner that links here.",
    }),
    defineField({
      name: "bannerHeadline",
      title: "Banner headline",
      type: "string",
      initialValue: "Estimate Your Roof",
      group: "banner",
    }),
    defineField({
      name: "bannerCtaLabel",
      title: "Banner button label",
      type: "string",
      initialValue: "Start estimate",
      group: "banner",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      group: "seo",
      description:
        "Browser tab title. Falls back to a built-in default when empty.",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 3,
      group: "seo",
      description: "Meta description for search and social previews.",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Estimator page" }),
  },
});
