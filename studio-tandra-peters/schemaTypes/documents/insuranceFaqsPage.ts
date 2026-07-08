import { defineField, defineType } from "sanity";

export const insuranceFaqsPageType = defineType({
  fields: [
    defineField({
      description: "Browser tab title for /insurance-faqs.",
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      description: "Meta description for search and social previews.",
      name: "seoDescription",
      rows: 3,
      title: "SEO description",
      type: "text",
    }),
    defineField({
      description:
        "First FAQ block on /insurance-faqs — loss sheets, checks, depreciation, payments.",
      name: "claimsFaq",
      title: "Insurance claim FAQ",
      type: "faqSection",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description:
        "Second FAQ block on /insurance-faqs — pre/post-install supplements and approvals.",
      name: "supplementsFaq",
      title: "Insurance supplements FAQ",
      type: "faqSection",
      validation: (Rule) => Rule.required(),
    }),
  ],
  name: "insuranceFaqsPage",
  preview: {
    prepare: () => ({ title: "Insurance FAQs page" }),
  },
  title: "Insurance FAQs page",
  type: "document",
});
