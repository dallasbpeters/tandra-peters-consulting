import { defineField, defineType } from "sanity";

export const birdcreekAdvantageCardType = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Heading",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "blockContent",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: "Learn More",
      name: "ctaLabel",
      title: "CTA label",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: "https://birdcreekroofing.com",
      name: "ctaHref",
      title: "CTA link",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "birdcreekAdvantageCard",
  title: "Birdcreek advantage card",
  type: "object",
});
