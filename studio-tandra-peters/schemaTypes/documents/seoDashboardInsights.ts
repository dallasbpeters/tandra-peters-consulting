import { defineArrayMember, defineField, defineType } from "sanity";

export const seoDashboardInsightsType = defineType({
  fields: [
    defineField({
      initialValue: "SEO Dashboard Insights",
      name: "title",
      readOnly: true,
      type: "string",
    }),
    defineField({
      name: "lastGeneratedAt",
      readOnly: true,
      title: "Last generated at",
      type: "datetime",
    }),
    defineField({
      name: "model",
      readOnly: true,
      type: "string",
    }),
    defineField({
      name: "siteUrl",
      readOnly: true,
      type: "string",
    }),
    defineField({
      name: "summary",
      rows: 6,
      type: "text",
    }),
    defineField({
      description:
        "Cached full dashboard payload used for fast loads until a manual regenerate is requested.",
      name: "snapshotPayload",
      readOnly: true,
      rows: 12,
      title: "Snapshot payload",
      type: "text",
    }),
    defineField({
      name: "recommendations",
      of: [defineArrayMember({ type: "seoDashboardRecommendation" })],
      type: "array",
    }),
    defineField({
      name: "opportunities",
      of: [defineArrayMember({ type: "seoDashboardOpportunity" })],
      type: "array",
    }),
  ],
  name: "seoDashboardInsights",
  preview: {
    prepare({ title, subtitle }) {
      return {
        subtitle: subtitle ? `Updated ${subtitle}` : "Not generated yet",
        title: title || "SEO Dashboard Insights",
      };
    },
    select: {
      subtitle: "lastGeneratedAt",
      title: "title",
    },
  },
  title: "SEO dashboard insights",
  type: "document",
});
