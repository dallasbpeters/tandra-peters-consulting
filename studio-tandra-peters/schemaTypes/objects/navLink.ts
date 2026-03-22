import {defineField, defineType} from 'sanity'

export const navLinkType = defineType({
  name: 'navLink',
  title: 'Navigation link',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'href',
      type: 'string',
      description: 'e.g. #services, /privacy',
      validation: (rule) => rule.required(),
    }),
  ],
})
