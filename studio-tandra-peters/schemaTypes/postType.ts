import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "./generatedImageField";

export const postType = defineType({
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      options: { source: "title" },
      type: "slug",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: () => new Date().toISOString(),
      name: "publishedAt",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      options: {
        layout: "dropdown",
        list: [
          { title: "Roof replacement", value: "roof-replacement" },
          { title: "Insurance & claims", value: "insurance-claims" },
          { title: "Inspections", value: "inspections" },
          { title: "Maintenance", value: "maintenance" },
          { title: "Texas homeowners", value: "texas-homeowners" },
        ],
      },
      title: "Category",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Short summary for article cards and meta (1–2 sentences).",
      name: "excerpt",
      rows: 3,
      title: "Excerpt",
      type: "text",
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      description:
        "Meta description (~150 characters). Falls back to excerpt if empty.",
      name: "seoDescription",
      rows: 2,
      title: "SEO description",
      type: "text",
      validation: (rule) => rule.max(200),
    }),
    defineField({
      initialValue: "Tandra Peters",
      name: "authorName",
      title: "Author name",
      type: "string",
    }),
    defineGeneratedImage({
      description:
        "Optional; used on listing cards and social previews when set.",
      name: "image",
      title: "Cover image",
    }),
    defineField({
      name: "body",
      type: "blockContent",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description:
        "Optional article-specific FAQ for the bottom of the article page. Leave empty to use the generated fallback FAQs.",
      name: "faq",
      title: "Article FAQ",
      type: "faqSection",
    }),
  ],
  name: "post",
  orderings: [
    {
      by: [{ direction: "desc", field: "publishedAt" }],
      name: "publishedAtDesc",
      title: "Published (newest first)",
    },
    {
      by: [{ direction: "asc", field: "publishedAt" }],
      name: "publishedAtAsc",
      title: "Published (oldest first)",
    },
  ],
  preview: {
    prepare({ title, category, publishedAt }) {
      const subtitle = [category, publishedAt].filter(Boolean).join(" · ");
      return {
        subtitle: subtitle || undefined,
        title: title || "Untitled post",
      };
    },
    select: {
      category: "category",
      publishedAt: "publishedAt",
      title: "title",
    },
  },
  title: "Post",
  type: "document",
});
