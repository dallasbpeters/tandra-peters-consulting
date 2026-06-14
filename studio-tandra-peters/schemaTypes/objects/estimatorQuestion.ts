import { defineField, defineType } from "sanity";

/**
 * estimatorQuestion — one step in the estimator wizard.
 *
 * Exactly one question across the estimator should have "Drives square footage"
 * turned on (typically the "How big is your home?" question). The selected
 * option's `sqftMidpoint` becomes the home size the estimate scales from.
 */
export const estimatorQuestionType = defineType({
  name: "estimatorQuestion",
  title: "Question",
  type: "object",
  fields: [
    defineField({
      name: "prompt",
      title: "Question",
      type: "string",
      description: 'The question shown to the visitor, e.g. "How big is your home?"',
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "helpText",
      title: "Help text",
      type: "string",
      description: "Optional sentence under the question for extra guidance.",
    }),
    defineField({
      name: "drivesSquareFootage",
      title: "Drives square footage",
      type: "boolean",
      initialValue: false,
      description:
        "Turn ON for the home-size question. The chosen option's square footage drives the whole estimate. Only turn this on for ONE question.",
    }),
    defineField({
      name: "options",
      title: "Answer options",
      type: "array",
      of: [{ type: "estimatorOption" }],
      validation: (Rule) => Rule.required().min(2),
    }),
  ],
  preview: {
    select: { title: "prompt", drives: "drivesSquareFootage", options: "options" },
    prepare({ title, drives, options }: { title?: string; drives?: boolean; options?: unknown[] }) {
      const count = Array.isArray(options) ? options.length : 0;
      return {
        title: title ?? "Untitled question",
        subtitle: `${count} option${count === 1 ? "" : "s"}${drives ? " · drives square footage" : ""}`,
      };
    },
  },
});
