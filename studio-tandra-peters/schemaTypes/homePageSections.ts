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
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'blockContent',
      description: 'Supporting paragraph under the headline (bold, links, lists).',
    }),
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
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      description: 'Main copy (replaces legacy “paragraphs” list).',
    }),
  ],
})

export const statsSectionType = defineType({
  name: 'statsSection',
  title: 'Stats strip',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Heading',
      description: 'Short label shown beside the numbers (e.g. BirdCreek Roofing in Austin).',
    }),
    defineField({
      name: 'items',
      title: 'Stats',
      type: 'array',
      of: [{type: 'statRow'}],
      validation: (rule) => rule.min(1).max(8),
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
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
    defineField({
      name: 'services',
      type: 'array',
      of: [{type: 'serviceCard'}],
      validation: (rule) => rule.min(1).max(6),
    }),
    defineField({
      name: 'birdcreekAdvantage',
      title: 'BirdCreek advantage',
      type: 'birdcreekAdvantageCard',
      description: 'Large branded card shown beneath the services grid.',
    }),
  ],
})

export const missionSectionType = defineType({
  name: 'missionSection',
  title: 'Mission',
  type: 'object',
  fields: [
    defineField({name: 'tagline', type: 'string'}),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'blockContent',
      description: 'Headline beside the tagline (use Normal style for a single line, or structure as needed).',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'blockContent',
    }),
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
      title: 'Empty state note',
      type: 'blockContent',
      description: 'Optional copy when no widget id (usually leave empty).',
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
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'blockContent',
    }),
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
    defineField({
      name: 'shareText',
      title: 'Share text',
      type: 'blockContent',
      description: 'Plain text is used for Twitter/email share strings (formatting is stripped for URLs).',
    }),
  ],
})

export const articlesTeaserSectionType = defineType({
  name: 'articlesTeaserSection',
  title: 'Articles teaser',
  type: 'object',
  description:
    'Pick which articles appear as cards on the home page, or leave the list empty to use the newest posts automatically.',
  fields: [
    defineField({
      name: 'eyebrow',
      type: 'string',
      title: 'Eyebrow label',
      initialValue: 'Guides & insights',
    }),
    defineField({
      name: 'title',
      type: 'string',
      title: 'Heading',
      initialValue: 'Roofing articles',
    }),
    defineField({
      name: 'intro',
      title: 'Intro (right column)',
      type: 'blockContent',
      description: 'Short blurb beside the heading; links and bold allowed.',
    }),
    defineField({
      name: 'viewAllLabel',
      type: 'string',
      title: '“View all” link label',
      initialValue: 'View all articles',
    }),
    defineField({
      name: 'articles',
      title: 'Articles on the home page',
      type: 'array',
      description:
        'Add posts here to choose exactly what shows and in what order (drag to reorder). Leave empty to show the newest posts instead — then use the number field below.',
      of: [
        {
          type: 'reference',
          to: [{type: 'post'}],
          options: {
            disableNew: true,
          },
        },
      ],
      validation: (rule) => rule.unique().max(50),
    }),
    defineField({
      name: 'maxPosts',
      type: 'number',
      title: 'How many article cards',
      description:
        'Maximum cards on the home page — for both the picked list above and automatic newest posts when that list is empty.',
      initialValue: 8,
      validation: (rule) => rule.required().min(1).max(50).integer(),
    }),
    defineField({
      name: 'enabled',
      type: 'boolean',
      hidden: true,
      deprecated: {
        reason:
          'No longer used — the articles block is always shown when posts exist.',
      },
    }),
    defineField({
      name: 'featuredPosts',
      type: 'array',
      hidden: true,
      deprecated: {reason: 'No longer used — remove when convenient (optional).'},
      of: [{type: 'reference', to: [{type: 'post'}]}],
    }),
  ],
})
