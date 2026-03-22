import {defineField, defineType} from 'sanity'
import {defineGeminiImage} from '../geminiImageField'

export const serviceCardType = defineType({
  name: 'serviceCard',
  title: 'Service card',
  type: 'object',
  fields: [
    defineField({name: 'id', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'description', type: 'text', rows: 4, validation: (r) => r.required()}),
    defineField({
      name: 'icon',
      type: 'string',
      options: {
        list: [
          {title: 'Search (assessment)', value: 'search'},
          {title: 'FileText (insurance)', value: 'fileText'},
          {title: 'ShieldCheck (oversight)', value: 'shieldCheck'},
        ],
      },
      initialValue: 'search',
      validation: (r) => r.required(),
    }),
    defineGeminiImage({
      name: 'image',
      title: 'Image',
      description: 'Optional card image (upload or AI).',
    }),
  ],
})
