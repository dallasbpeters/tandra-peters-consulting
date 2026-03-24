import {defineArrayMember, defineField, defineType} from 'sanity'

export const aiContextType = defineType({
  name: 'aiContext',
  title: 'AI context',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      initialValue: 'AI Context',
      readOnly: true,
    }),
    defineField({
      name: 'instructions',
      title: 'Core instructions',
      type: 'text',
      rows: 8,
      description: 'High-level guidance the dashboard AI should follow when generating recommendations.',
    }),
    defineField({
      name: 'businessPriorities',
      title: 'Business priorities',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {sortable: true},
    }),
    defineField({
      name: 'guardrails',
      title: 'Guardrails',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {sortable: true},
      description: 'Things the AI should avoid or rules it must respect.',
    }),
    defineField({
      name: 'targetKeywords',
      title: 'Target keywords',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {sortable: true},
    }),
    defineField({
      name: 'preferredInternalLinks',
      title: 'Preferred internal links',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {sortable: true},
      description: 'Important pages or routes the AI should favor when suggesting internal links.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'instructions',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'AI Context',
        subtitle: subtitle ? subtitle.slice(0, 80) : 'No AI guidance added yet',
      }
    },
  },
})
