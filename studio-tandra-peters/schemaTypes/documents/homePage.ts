import {defineField, defineType} from 'sanity'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  groups: [
    {name: 'hero', title: 'Hero', default: true},
    {name: 'marquee', title: 'Marquee'},
    {name: 'about', title: 'About'},
    {name: 'stats', title: 'Stats'},
    {name: 'services', title: 'Services'},
    {name: 'mission', title: 'Mission'},
    {name: 'expertise', title: 'Expertise'},
    {name: 'testimonials', title: 'Testimonials'},
    {name: 'faq', title: 'FAQ'},
    {name: 'articles', title: 'Articles teaser'},
    {name: 'contact', title: 'Contact'},
    {name: 'social', title: 'Social share'},
  ],
  fields: [
    defineField({
      name: 'hero',
      type: 'heroSection',
      group: 'hero',
    }),
    defineField({
      name: 'marquee',
      type: 'marqueeSection',
      group: 'marquee',
    }),
    defineField({
      name: 'about',
      type: 'aboutSection',
      group: 'about',
    }),
    defineField({
      name: 'stats',
      type: 'statsSection',
      group: 'stats',
    }),
    defineField({
      name: 'services',
      type: 'servicesSection',
      group: 'services',
    }),
    defineField({
      name: 'mission',
      type: 'missionSection',
      group: 'mission',
    }),
    defineField({
      name: 'expertise',
      type: 'expertiseSection',
      group: 'expertise',
    }),
    defineField({
      name: 'testimonials',
      type: 'testimonialsSection',
      group: 'testimonials',
    }),
    defineField({
      name: 'faq',
      type: 'faqSection',
      group: 'faq',
    }),
    defineField({
      name: 'articlesTeaser',
      type: 'articlesTeaserSection',
      group: 'articles',
    }),
    defineField({
      name: 'contact',
      type: 'contactSection',
      group: 'contact',
    }),
    defineField({
      name: 'socialShare',
      type: 'socialShareSection',
      group: 'social',
    }),
  ],
  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
