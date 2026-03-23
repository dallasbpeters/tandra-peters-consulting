import {defineField, defineType} from 'sanity'

export const articlesPageType = defineType({
  name: 'articlesPage',
  title: 'Articles page',
  type: 'document',
  fields: [
    defineField({
      name: 'pageTitle',
      title: 'Page heading',
      type: 'string',
      description: 'Shown as the main H1 on /articles.',
      initialValue: 'Articles',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'blockContent',
      description: 'Short text below the heading.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      description: 'Browser tab title. If empty, the page heading is used with the site name.',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      description: 'Meta description for search and social previews.',
    }),
  ],
  preview: {
    select: {title: 'pageTitle'},
    prepare: ({title}) => ({title: title || 'Articles page'}),
  },
})
