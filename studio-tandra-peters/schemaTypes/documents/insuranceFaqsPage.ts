import { defineField, defineType } from "sanity";

export const insuranceFaqsPageType = defineType({
  name: "insuranceFaqsPage",
  title: "Insurance FAQs page",
  type: "document",
  fields: [
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      description: "Browser tab title for /insurance-faqs.",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 3,
      description: "Meta description for search and social previews.",
    }),
    defineField({
      name: "claimsFaq",
      title: "Insurance claim FAQ",
      type: "faqSection",
      description:
        "First FAQ block on /insurance-faqs — loss sheets, checks, depreciation, payments.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "supplementsFaq",
      title: "Insurance supplements FAQ",
      type: "faqSection",
      description:
        "Second FAQ block on /insurance-faqs — pre/post-install supplements and approvals.",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Insurance FAQs page" }),
  },
});
