import {defineField, defineType} from 'sanity'
import {SERVICE_ICON_OPTIONS} from '../../../src/sanity/serviceIconMeta'

export const statRowType = defineType({
  name: 'statRow',
  title: 'Stat',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      title: 'Label',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'value',
      type: 'string',
      title: 'Value',
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
      initialValue: 'home',
      validation: (r) => r.required(),
    }),
  ],
})
