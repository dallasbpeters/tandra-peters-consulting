import { defineArrayMember, defineType } from "sanity";

/** Shared rich text: headings, lists, links, bold/italic — use across homepage + posts. */
export const blockContentType = defineType({
  name: "blockContent",
  of: [
    defineArrayMember({
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        annotations: [
          {
            fields: [
              {
                name: "href",
                title: "URL",
                type: "url",
                validation: (Rule) =>
                  Rule.uri({
                    allowRelative: true,
                    scheme: ["http", "https", "mailto", "tel"],
                  }),
              },
            ],
            name: "link",
            title: "Link",
            type: "object",
          },
        ],
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
        ],
      },
      styles: [
        { title: "Normal", value: "normal" },
        { title: "Heading 2", value: "h2" },
        { title: "Heading 3", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      type: "block",
    }),
  ],
  title: "Rich text",
  type: "array",
});
