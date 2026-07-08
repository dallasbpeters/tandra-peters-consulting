import { defineField, defineType } from "sanity";

export const faqItemType = defineType({
  fields: [
    defineField({
      name: "question",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "answer",
      title: "Answer",
      type: "blockContent",
      validation: (r) => r.required(),
    }),
  ],
  name: "faqItem",
  title: "FAQ item",
  type: "object",
});
