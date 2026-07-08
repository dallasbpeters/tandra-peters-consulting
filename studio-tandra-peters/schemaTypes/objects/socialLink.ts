import { defineField, defineType } from "sanity";

export const socialLinkType = defineType({
  fields: [
    defineField({
      name: "platform",
      options: {
        layout: "radio",
        list: [
          { title: "Facebook", value: "facebook" },
          { title: "Email", value: "email" },
          { title: "Phone", value: "phone" },
        ],
      },
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "url",
      type: "url",
      validation: (rule) =>
        rule.required().uri({
          allowRelative: false,
          scheme: ["http", "https", "mailto", "tel"],
        }),
    }),
  ],
  name: "socialLink",
  title: "Social link",
  type: "object",
});
