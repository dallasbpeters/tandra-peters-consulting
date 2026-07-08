import { defineField, defineType } from "sanity";

export const articlesPageType = defineType({
  fields: [
    defineField({
      description: "Shown as the main H1 on /articles.",
      initialValue: "Articles",
      name: "pageTitle",
      title: "Page heading",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description: "Short text below the heading.",
      name: "intro",
      title: "Introduction",
      type: "blockContent",
    }),
    defineField({
      description:
        "Browser tab title. If empty, the page heading is used with the site name.",
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
  ],
  name: "articlesPage",
  preview: {
    prepare: ({ title }) => ({ title: title || "Articles page" }),
    select: { title: "pageTitle" },
  },
  title: "Articles page",
  type: "document",
});
