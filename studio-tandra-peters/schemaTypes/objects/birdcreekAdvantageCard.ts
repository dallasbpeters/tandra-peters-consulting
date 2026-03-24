import {defineField, defineType} from 'sanity'

export const birdcreekAdvantageCardType = defineType({
  name: 'birdcreekAdvantageCard',
  title: 'Birdcreek advantage card',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Heading',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ctaLabel',
      type: 'string',
      title: 'CTA label',
      validation: (rule) => rule.required(),
      initialValue: 'Learn More',
    }),
    defineField({
      name: 'ctaHref',
      type: 'string',
      title: 'CTA link',
      validation: (rule) => rule.required(),
      initialValue: 'https://birdcreekroofing.com',
    }),
  ],
})
