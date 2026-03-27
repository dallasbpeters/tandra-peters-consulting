import {defineArrayMember, defineField, defineType} from 'sanity'

export const seoDashboardInsightsType = defineType({
  name: 'seoDashboardInsights',
  title: 'SEO dashboard insights',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      initialValue: 'SEO Dashboard Insights',
      readOnly: true,
    }),
    defineField({
      name: 'lastGeneratedAt',
      title: 'Last generated at',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'model',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'siteUrl',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 6,
    }),
    defineField({
      name: 'snapshotPayload',
      title: 'Snapshot payload',
      type: 'text',
      rows: 12,
      readOnly: true,
      description:
        'Cached full dashboard payload used for fast loads until a manual regenerate is requested.',
    }),
    defineField({
      name: 'recommendations',
      type: 'array',
      of: [defineArrayMember({type: 'seoDashboardRecommendation'})],
    }),
    defineField({
      name: 'opportunities',
      type: 'array',
      of: [defineArrayMember({type: 'seoDashboardOpportunity'})],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'lastGeneratedAt',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'SEO Dashboard Insights',
        subtitle: subtitle ? `Updated ${subtitle}` : 'Not generated yet',
      }
    },
  },
})
