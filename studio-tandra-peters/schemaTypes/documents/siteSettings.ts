import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "navLogoText",
      type: "string",
      title: "Nav logo text",
    }),
    defineField({
      name: "navLogoTagline",
      type: "string",
      title: "Nav logo tagline",
    }),
    defineGeneratedImage({
      name: "navLogoImage",
      title: "Nav logo image",
      description:
        "Sanity image asset (upload or AI). Shown beside logo text in the nav.",
    }),
    defineField({
      name: "navItems",
      type: "array",
      of: [{ type: "navLink" }],
    }),
    defineField({
      name: "navCtaText",
      type: "string",
      title: "Nav primary CTA text",
    }),
    defineField({
      name: "navCtaHref",
      type: "string",
      title: "Nav primary CTA link",
      initialValue: "#contact",
    }),
    defineField({
      name: "navSecondaryCtaText",
      type: "string",
      title: "Nav secondary CTA text",
      description:
        "Used by the dual-CTA rail nav variant (e.g. Explore Services).",
    }),
    defineField({
      name: "navSecondaryCtaHref",
      type: "string",
      title: "Nav secondary CTA link",
      initialValue: "#services",
    }),
    defineField({ name: "footerLogoText", type: "string" }),
    defineField({
      name: "footerDescription",
      title: "Footer description",
      type: "blockContent",
    }),
    defineField({
      name: "footerQuickLinks",
      type: "array",
      of: [{ type: "navLink" }],
    }),
    defineField({
      name: "footerLegalLinks",
      type: "array",
      of: [{ type: "navLink" }],
      description: "Typically /privacy, /terms, /cookies",
    }),
    defineField({
      name: "footerSocialLinks",
      type: "array",
      of: [{ type: "socialLink" }],
    }),
    defineField({ name: "footerCopyrightText", type: "string" }),
    defineField({ name: "footerPartnerText", type: "string" }),
  ],
  preview: {
    prepare: () => ({ title: "Site settings" }),
  },
});
