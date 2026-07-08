import { defineField, defineType } from "sanity";

export const seoDashboardOpportunityType = defineType({
  fields: [
    defineField({
      name: "type",
      options: {
        layout: "radio",
        list: [
          { title: "Fix", value: "fix" },
          { title: "Refresh", value: "refresh" },
          { title: "New content", value: "new-content" },
        ],
      },
      type: "string",
      validation: (rule) => rule.required(),
    }),
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
      description: "Route or path the recommendation applies to.",
      name: "target",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "impact",
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
  name: "seoDashboardOpportunity",
  title: "SEO dashboard opportunity",
  type: "object",
});
