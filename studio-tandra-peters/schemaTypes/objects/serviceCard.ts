import {defineField, defineType} from 'sanity'
import {SERVICE_ICON_OPTIONS} from '../serviceIconMeta'
import {defineGeminiImage} from '../geminiImageField'

export const serviceCardType = defineType({
  name: 'serviceCard',
  title: 'Service card',
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
    defineField({
      name: 'icon',
      type: 'string',
      title: 'Icon (Iconoir)',
      options: {
        list: [...SERVICE_ICON_OPTIONS],
        layout: 'dropdown',
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
