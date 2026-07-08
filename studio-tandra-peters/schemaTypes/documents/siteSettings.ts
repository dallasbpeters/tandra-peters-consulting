import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";

export const siteSettingsType = defineType({
  fields: [
    defineField({
      name: "navLogoText",
      title: "Nav logo text",
      type: "string",
    }),
    defineField({
      name: "navLogoTagline",
      title: "Nav logo tagline",
      type: "string",
    }),
    defineGeneratedImage({
      description:
        "Sanity image asset (upload or AI). Shown beside logo text in the nav.",
      name: "navLogoImage",
      title: "Nav logo image",
    }),
    defineField({
      name: "navItems",
      of: [{ type: "navLink" }],
      type: "array",
    }),
    defineField({
      name: "navCtaText",
      title: "Nav primary CTA text",
      type: "string",
    }),
    defineField({
      initialValue: "#contact",
      name: "navCtaHref",
      title: "Nav primary CTA link",
      type: "string",
    }),
    defineField({
      description:
        "Used by the dual-CTA rail nav variant (e.g. Explore Services).",
      name: "navSecondaryCtaText",
      title: "Nav secondary CTA text",
      type: "string",
    }),
    defineField({
      initialValue: "#services",
      name: "navSecondaryCtaHref",
      title: "Nav secondary CTA link",
      type: "string",
    }),
    defineField({ name: "footerLogoText", type: "string" }),
    defineField({
      name: "footerDescription",
      title: "Footer description",
      type: "blockContent",
    }),
    defineField({
      name: "footerQuickLinks",
      of: [{ type: "navLink" }],
      type: "array",
    }),
    defineField({
      description: "Typically /privacy, /terms, /cookies",
      name: "footerLegalLinks",
      of: [{ type: "navLink" }],
      type: "array",
    }),
    defineField({
      name: "footerSocialLinks",
      of: [{ type: "socialLink" }],
      type: "array",
    }),
    defineField({ name: "footerCopyrightText", type: "string" }),
    defineField({ name: "footerPartnerText", type: "string" }),
  ],
  name: "siteSettings",
  preview: {
    prepare: () => ({ title: "Site settings" }),
  },
  title: "Site settings",
  type: "document",
});
