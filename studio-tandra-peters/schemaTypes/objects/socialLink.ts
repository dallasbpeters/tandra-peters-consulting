import {defineField, defineType} from 'sanity'

export const socialLinkType = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      type: 'string',
      options: {
        list: [
          {title: 'Instagram', value: 'instagram'},
          {title: 'LinkedIn', value: 'linkedin'},
          {title: 'Facebook', value: 'facebook'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      type: 'url',
      validation: (rule) => rule.required().uri({allowRelative: false, scheme: ['http', 'https']}),
    }),
  ],
})
