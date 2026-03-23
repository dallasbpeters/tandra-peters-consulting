import {defineField, defineType} from 'sanity'
import {defineGeminiImage} from '../geminiImageField'

export const missionValueType = defineType({
  name: 'missionValue',
  title: 'Mission value',
  type: 'object',
  fields: [
    defineField({name: 'id', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
      validation: (r) => r.required(),
    }),
    defineGeminiImage({
      name: 'image',
      title: 'Background image',
      description: 'Optional card background (upload or AI).',
    }),
  ],
})
