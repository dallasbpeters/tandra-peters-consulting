import {defineField, defineType} from 'sanity'
import {defineGeminiImage} from './geminiImageField'

export const heroSectionType = defineType({
  name: 'heroSection',
  title: 'Hero',
  type: 'object',
  fields: [
    defineField({name: 'badge', type: 'string', title: 'Badge text'}),
    defineField({name: 'titleLine1', type: 'string', title: 'Title line 1'}),
    defineField({name: 'titleLine2', type: 'string', title: 'Title line 2 (muted accent)'}),
    defineField({name: 'subtitle', type: 'text', rows: 4}),
    defineField({name: 'ctaText', type: 'string'}),
    defineField({name: 'ctaHref', type: 'string', initialValue: '#contact'}),
    defineField({name: 'secondaryCtaText', type: 'string', initialValue: 'Explore Services'}),
    defineField({name: 'secondaryCtaHref', type: 'string', initialValue: '#services'}),
    defineGeminiImage({
      name: 'backgroundImage',
      title: 'Background image',
      description: 'Sanity image asset (upload, Media Library, or Generate with AI).',
    }),
  ],
})

export const marqueeSectionType = defineType({
  name: 'marqueeSection',
  title: 'Scroll marquee',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      type: 'text',
      rows: 2,
      description: 'Single line of locations / ticker copy',
    }),
    defineField({
      name: 'direction',
      type: 'string',
      options: {list: [{title: 'Right', value: 'right'}, {title: 'Left', value: 'left'}]},
      initialValue: 'right',
    }),
    defineField({name: 'velocity', type: 'number', initialValue: 80}),
  ],
})

export const aboutSectionType = defineType({
  name: 'aboutSection',
  title: 'About',
  type: 'object',
  fields: [
    defineField({name: 'badgeText', type: 'string'}),
    defineField({name: 'badgeSubtext', type: 'string'}),
    defineGeminiImage({
      name: 'image',
      title: 'Portrait / main image',
      description: 'Sanity image asset (upload or AI).',
    }),
    defineField({name: 'titleLine1', type: 'string'}),
    defineField({name: 'titleLine2', type: 'string'}),
    defineField({
      name: 'paragraphs',
      type: 'array',
      of: [{type: 'text', rows: 5}],
      description: 'Each item is a paragraph of body copy.',
    }),
  ],
})

export const servicesSectionType = defineType({
  name: 'servicesSection',
  title: 'Services',
  type: 'object',
  fields: [
    defineField({name: 'tagline', type: 'string'}),
    defineField({
      name: 'titleLines',
      type: 'array',
      of: [{type: 'string'}],
      validation: (rule) => rule.max(5),
    }),
    defineField({name: 'description', type: 'text', rows: 5}),
    defineField({
      name: 'services',
      type: 'array',
      of: [{type: 'serviceCard'}],
      validation: (rule) => rule.min(1).max(6),
    }),
  ],
})

export const missionSectionType = defineType({
  name: 'missionSection',
  title: 'Mission',
  type: 'object',
  fields: [
    defineField({name: 'tagline', type: 'string'}),
    defineField({name: 'title', type: 'text', rows: 2}),
    defineField({name: 'description', type: 'text', rows: 5}),
    defineField({
      name: 'values',
      type: 'array',
      of: [{type: 'missionValue'}],
      validation: (rule) => rule.min(1).max(6),
    }),
  ],
})

export const expertiseSectionType = defineType({
  name: 'expertiseSection',
  title: 'Expertise',
  type: 'object',
  fields: [
    defineField({name: 'tagline', type: 'string'}),
    defineField({name: 'title', type: 'string'}),
    defineField({
      name: 'items',
      type: 'array',
      of: [{type: 'expertiseItem'}],
      validation: (rule) => rule.min(1),
    }),
  ],
})

export const testimonialsSectionType = defineType({
  name: 'testimonialsSection',
  title: 'Testimonials',
  type: 'object',
  fields: [
    defineField({
      name: 'elfsightWidgetId',
      type: 'string',
      description: 'Overrides VITE_ELFSIGHT_WIDGET_ID when set (UUID only)',
    }),
    defineField({
      name: 'emptyStateNote',
      type: 'text',
      rows: 3,
      description: 'Optional copy when no widget id (usually leave empty)',
    }),
  ],
})

export const faqSectionType = defineType({
  name: 'faqSection',
  title: 'FAQ',
  type: 'object',
  fields: [
    defineField({name: 'tagline', type: 'string'}),
    defineField({name: 'title', type: 'string'}),
    defineField({name: 'intro', type: 'text', rows: 3}),
    defineField({
      name: 'items',
      type: 'array',
      of: [{type: 'faqItem'}],
      validation: (rule) => rule.min(1),
    }),
  ],
})

export const contactSectionType = defineType({
  name: 'contactSection',
  title: 'Contact',
  type: 'object',
  fields: [
    defineField({name: 'tagline', type: 'string'}),
    defineField({name: 'title', type: 'string'}),
    defineField({name: 'email', type: 'string'}),
    defineField({name: 'phone', type: 'string'}),
    defineField({name: 'location', type: 'string'}),
  ],
})

export const socialShareSectionType = defineType({
  name: 'socialShareSection',
  title: 'Social share bar',
  type: 'object',
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'shareText', type: 'text', rows: 2}),
  ],
})
