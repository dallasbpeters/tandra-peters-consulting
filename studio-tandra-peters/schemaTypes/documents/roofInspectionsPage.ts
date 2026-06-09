import { defineField, defineType } from "sanity";

export const roofInspectionsPageType = defineType({
  name: "roofInspectionsPage",
  title: "Roof inspections page",
  type: "document",
  fields: [
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      description: "Browser tab title for /roof-inspections.",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 3,
      description: "Meta description for the roof inspections page.",
    }),
    defineField({
      name: "roofInspection",
      title: "Roof inspection section",
      type: "roofInspectionSection",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Roof inspections page" }),
  },
});
