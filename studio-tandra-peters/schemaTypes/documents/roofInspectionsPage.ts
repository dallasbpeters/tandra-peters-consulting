import { defineField, defineType } from "sanity";

export const roofInspectionsPageType = defineType({
  fields: [
    defineField({
      description: "Browser tab title for /roof-inspections.",
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      description: "Meta description for the roof inspections page.",
      name: "seoDescription",
      rows: 3,
      title: "SEO description",
      type: "text",
    }),
    defineField({
      name: "roofInspection",
      title: "Roof inspection section",
      type: "roofInspectionSection",
      validation: (Rule) => Rule.required(),
    }),
  ],
  name: "roofInspectionsPage",
  preview: {
    prepare: () => ({ title: "Roof inspections page" }),
  },
  title: "Roof inspections page",
  type: "document",
});
