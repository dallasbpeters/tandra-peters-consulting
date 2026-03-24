import {defineField, defineType} from 'sanity'

export const seoDashboardOpportunityType = defineType({
  name: 'seoDashboardOpportunity',
  title: 'SEO dashboard opportunity',
  type: 'object',
  fields: [
    defineField({
      name: 'type',
      type: 'string',
      options: {
        list: [
          {title: 'Fix', value: 'fix'},
          {title: 'Refresh', value: 'refresh'},
          {title: 'New content', value: 'new-content'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
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
      name: 'target',
      type: 'string',
      description: 'Route or path the recommendation applies to.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'impact',
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
