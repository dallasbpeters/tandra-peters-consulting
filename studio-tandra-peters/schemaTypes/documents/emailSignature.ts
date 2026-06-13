import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";

/**
 * Reusable email sign-off for Tandra. Referenced by client emails so the
 * signature block stays consistent across every template.
 */
export const emailSignatureType = defineType({
  name: "emailSignature",
  title: "Email signature",
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
      title: "Full name",
      initialValue: "Tandra Peters",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "jobTitle",
      type: "string",
      title: "Job title",
      initialValue: "Roofing Consultant",
    }),
    defineField({
      name: "company",
      type: "string",
      title: "Company",
      initialValue: "Birdcreek Roofing",
    }),
    defineField({
      name: "tagline",
      type: "string",
      title: "Tagline",
      description: "Short line under the name, e.g. service area or promise.",
      initialValue: "Helping Central Texas homeowners through the roofing process.",
    }),
    defineField({
      name: "phone",
      type: "string",
      title: "Phone",
    }),
    defineField({
      name: "email",
      type: "string",
      title: "Email",
    }),
    defineField({
      name: "website",
      type: "url",
      title: "Website",
      initialValue: "https://www.tandra.me",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
    }),
    defineGeneratedImage({
      name: "headshot",
      title: "Headshot",
      description: "Square portrait shown next to the signature.",
    }),
    defineGeneratedImage({
      name: "companyLogo",
      title: "Company logo",
      description: "Birdcreek logo shown below the signature.",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "jobTitle" },
    prepare: ({ title, subtitle }) => ({
      title: title || "Email signature",
      subtitle: subtitle || "Signature",
    }),
  },
});
