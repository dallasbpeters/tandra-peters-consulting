import { defineField, defineType } from "sanity";

/**
 * estimatorOption — a single answer choice within an estimator question.
 *
 * Pricing model (all fields optional; leave blank for $0 effect):
 *  - `sqftMidpoint` is ONLY read on the question marked "Drives square footage".
 *    It's the midpoint of a range like "1,500 – 2,000 sq ft" (so 1750). This is
 *    the home size the whole estimate scales from.
 *  - `sqftMultiplier` multiplies the running square footage. Used on questions
 *    marked "Multiplies square footage" (stories, complexity, pitch). Example:
 *    one-story = 1.0, two-story = 0.55, complex roof = 1.35, steep pitch = 1.3.
 *  - `pricePerSqftAdd` adds dollars-per-square-foot to the running rate. Use this
 *    for material/scope choices (e.g. metal roofing adds +$4.00/sqft).
 *  - `flatAdd` adds a flat dollar amount regardless of size (e.g. +$1,200 for a
 *    steep-pitch surcharge or skylight reflashing).
 *
 * Final estimate = (homeSqft × totalRatePerSqft) + totalFlatAdds, then widened
 * into a ± range so visitors always see "roughly $X – $Y", never one number.
 */
export const estimatorOptionType = defineType({
  fields: [
    defineField({
      description:
        'What the visitor sees, e.g. "1,500 – 2,000 sq ft" or "Metal roofing".',
      name: "label",
      title: "Label",
      type: "string",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      description:
        "Optional small print shown under the label on the option card.",
      name: "description",
      title: "Helper text",
      type: "string",
    }),
    defineField({
      description:
        'Only used on the question marked "Drives square footage". The middle of the range, e.g. enter 1750 for "1,500 – 2,000 sq ft".',
      name: "sqftMidpoint",
      title: "Square footage (midpoint)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      description:
        "Adds this dollar amount per square foot to the estimate. Use for material/scope upgrades. Can be negative for a discount.",
      name: "pricePerSqftAdd",
      title: "Add $ per sq ft",
      type: "number",
    }),
    defineField({
      description:
        "Adds a one-time flat dollar amount regardless of home size. Can be negative for a discount.",
      name: "flatAdd",
      title: "Add flat $",
      type: "number",
    }),
    defineField({
      description:
        "Multiplies the running roof square footage. Used on questions marked 'Multiplies square footage' (stories, complexity, pitch). Examples: one-story = 1.0, two-story = 0.55, complex roof = 1.35, steep pitch = 1.3.",
      name: "sqftMultiplier",
      title: "Multiply roof area by",
      type: "number",
      validation: (Rule) => Rule.min(0.1).max(5),
    }),
  ],
  name: "estimatorOption",
  preview: {
    prepare({
      title,
      sqft,
      mult,
      perSqft,
      flat,
    }: {
      title?: string;
      sqft?: number;
      mult?: number;
      perSqft?: number;
      flat?: number;
    }) {
      const bits: string[] = [];
      if (typeof sqft === "number") {
        bits.push(`${sqft.toLocaleString()} sq ft`);
      }
      if (typeof mult === "number" && mult !== 1) {
        bits.push(`${mult}× roof area`);
      }
      if (typeof perSqft === "number" && perSqft !== 0) {
        bits.push(`${perSqft > 0 ? "+" : ""}$${perSqft}/sqft`);
      }
      if (typeof flat === "number" && flat !== 0) {
        bits.push(`${flat > 0 ? "+" : ""}$${flat.toLocaleString()}`);
      }
      return {
        subtitle: bits.length ? bits.join(" · ") : "No price effect",
        title: title ?? "Untitled option",
      };
    },
    select: {
      flat: "flatAdd",
      mult: "sqftMultiplier",
      perSqft: "pricePerSqftAdd",
      sqft: "sqftMidpoint",
      title: "label",
    },
  },
  title: "Answer option",
  type: "object",
});
