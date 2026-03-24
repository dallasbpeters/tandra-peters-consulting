import {defineField, defineType} from 'sanity'

export const seoDashboardRecommendationType = defineType({
  name: 'seoDashboardRecommendation',
  title: 'SEO dashboard recommendation',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'detail',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'priority',
      type: 'string',
      options: {
        list: [
          {title: 'High', value: 'high'},
          {title: 'Medium', value: 'medium'},
          {title: 'Low', value: 'low'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
})
