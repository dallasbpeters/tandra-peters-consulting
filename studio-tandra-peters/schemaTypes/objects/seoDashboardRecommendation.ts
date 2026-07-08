import { defineField, defineType } from "sanity";

export const seoDashboardRecommendationType = defineType({
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "detail",
      rows: 4,
      type: "text",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "priority",
      options: {
        layout: "radio",
        list: [
          { title: "High", value: "high" },
          { title: "Medium", value: "medium" },
          { title: "Low", value: "low" },
        ],
      },
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "seoDashboardRecommendation",
  title: "SEO dashboard recommendation",
  type: "object",
});
