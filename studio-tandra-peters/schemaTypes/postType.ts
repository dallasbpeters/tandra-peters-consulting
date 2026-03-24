import {defineField, defineType} from 'sanity'
import {defineGeminiImage} from './geminiImageField'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  orderings: [
    {
      title: 'Published (newest first)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
    {
      title: 'Published (oldest first)',
      name: 'publishedAtAsc',
      by: [{field: 'publishedAt', direction: 'asc'}],
    },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'Roof replacement', value: 'roof-replacement'},
          {title: 'Insurance & claims', value: 'insurance-claims'},
          {title: 'Inspections', value: 'inspections'},
          {title: 'Maintenance', value: 'maintenance'},
          {title: 'Texas homeowners', value: 'texas-homeowners'},
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Short summary for article cards and meta (1–2 sentences).',
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 2,
      description: 'Meta description (~150 characters). Falls back to excerpt if empty.',
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'authorName',
      title: 'Author name',
      type: 'string',
      initialValue: 'Tandra Peters',
    }),
    defineGeminiImage({
      name: 'image',
      title: 'Cover image',
      description: 'Optional; used on listing cards and social previews when set.',
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'faq',
      title: 'Article FAQ',
      type: 'faqSection',
      description:
        'Optional article-specific FAQ for the bottom of the article page. Leave empty to use the generated fallback FAQs.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      publishedAt: 'publishedAt',
    },
    prepare({title, category, publishedAt}) {
      const subtitle = [category, publishedAt].filter(Boolean).join(' · ')
      return {
        title: title || 'Untitled post',
        subtitle: subtitle || undefined,
      }
    },
  },
})
