import { defineField, defineType } from "sanity";

/**
 * estimatorQuestion — one step in the estimator wizard.
 *
 * Exactly one question across the estimator should have "Drives square footage"
 * turned on (typically the "How big is your home?" question). The selected
 * option's `sqftMidpoint` becomes the home size the estimate scales from.
 *
 * Questions with "Multiplies square footage" turned on apply their selected
 * option's `sqftMultiplier` to the running roof area. Use for: stories,
 * roof complexity, and pitch (which affects both area and labor rate).
 */
export const estimatorQuestionType = defineType({
  fields: [
    defineField({
      description:
        'The question shown to the visitor, e.g. "How big is your home?"',
      name: "prompt",
      title: "Question",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      description: "Optional sentence under the question for extra guidance.",
      name: "helpText",
      title: "Help text",
      type: "string",
    }),
    defineField({
      description:
        "Turn ON for the home-size question. The chosen option's square footage drives the whole estimate. Only turn this on for ONE question.",
      initialValue: false,
      name: "drivesSquareFootage",
      title: "Drives square footage",
      type: "boolean",
    }),
    defineField({
      description:
        "Turn ON for questions that scale the roof area (stories, complexity, pitch). The chosen option's 'Multiply roof area by' value multiplies the running roof square footage.",
      initialValue: false,
      name: "multipliesSquareFootage",
      title: "Multiplies square footage",
      type: "boolean",
    }),
    defineField({
      name: "options",
      of: [{ type: "estimatorOption" }],
      title: "Answer options",
      type: "array",
      validation: (Rule) => Rule.required().min(2),
    }),
  ],
  name: "estimatorQuestion",
  preview: {
    prepare({
      title,
      drives,
      multiplies,
      options,
    }: {
      title?: string;
      drives?: boolean;
      multiplies?: boolean;
      options?: unknown[];
    }) {
      const count = Array.isArray(options) ? options.length : 0;
      const tags: string[] = [];
      if (drives) {
        tags.push("drives square footage");
      }
      if (multiplies) {
        tags.push("multiplies square footage");
      }
      return {
        subtitle: `${count} option${count === 1 ? "" : "s"}${tags.length ? ` · ${tags.join(" · ")}` : ""}`,
        title: title ?? "Untitled question",
      };
    },
    select: {
      drives: "drivesSquareFootage",
      multiplies: "multipliesSquareFootage",
      options: "options",
      title: "prompt",
    },
  },
  title: "Question",
  type: "object",
});
