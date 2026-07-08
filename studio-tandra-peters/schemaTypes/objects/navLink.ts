import { defineField, defineType } from "sanity";

export const navLinkType = defineType({
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "e.g. #services, /privacy",
      name: "href",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "navLink",
  title: "Navigation link",
  type: "object",
});
