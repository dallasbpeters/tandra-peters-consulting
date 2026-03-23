import {defineField, defineType} from 'sanity'
import {defineGeminiImage} from '../geminiImageField'

export const expertiseItemType = defineType({
  name: 'expertiseItem',
  title: 'Expertise item',
  type: 'object',
  fields: [
    defineField({name: 'id', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'desc',
      title: 'Description',
      type: 'blockContent',
      validation: (r) => r.required(),
    }),
    defineGeminiImage({
      name: 'image',
      title: 'Image',
      description: 'Sanity image asset (upload or AI).',
      validation: (r) => r.required(),
    }),
  ],
})
