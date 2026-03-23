import {defineField, defineType} from 'sanity'
import {defineGeminiImage} from '../geminiImageField'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'navLogoText',
      type: 'string',
      title: 'Nav logo text',
    }),
    defineField({name: 'navLogoTagline', type: 'string', title: 'Nav logo tagline'}),
    defineGeminiImage({
      name: 'navLogoImage',
      title: 'Nav logo image',
      description: 'Sanity image asset (upload or AI). Shown beside logo text in the nav.',
    }),
    defineField({
      name: 'navItems',
      type: 'array',
      of: [{type: 'navLink'}],
    }),
    defineField({name: 'navCtaText', type: 'string'}),
    defineField({name: 'navCtaHref', type: 'string', initialValue: '#contact'}),
    defineField({name: 'footerLogoText', type: 'string'}),
    defineField({
      name: 'footerDescription',
      title: 'Footer description',
      type: 'blockContent',
    }),
    defineField({
      name: 'footerQuickLinks',
      type: 'array',
      of: [{type: 'navLink'}],
    }),
    defineField({
      name: 'footerLegalLinks',
      type: 'array',
      of: [{type: 'navLink'}],
      description: 'Typically /privacy, /terms, /cookies',
    }),
    defineField({
      name: 'footerSocialLinks',
      type: 'array',
      of: [{type: 'socialLink'}],
    }),
    defineField({name: 'footerCopyrightText', type: 'string'}),
    defineField({name: 'footerPartnerText', type: 'string'}),
  ],
  preview: {
    prepare: () => ({title: 'Site settings'}),
  },
})
