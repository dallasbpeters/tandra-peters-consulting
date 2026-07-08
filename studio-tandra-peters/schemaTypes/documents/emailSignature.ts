import { defineField, defineType } from "sanity";

import { defineGeneratedImage } from "../generatedImageField";

/**
 * Reusable email sign-off for Tandra. Referenced by client emails so the
 * signature block stays consistent across every template.
 */
export const emailSignatureType = defineType({
  fields: [
    defineField({
      initialValue: "Tandra Peters",
      name: "name",
      title: "Full name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      initialValue: "Roofing Consultant",
      name: "jobTitle",
      title: "Job title",
      type: "string",
    }),
    defineField({
      initialValue: "Birdcreek Roofing",
      name: "company",
      title: "Company",
      type: "string",
    }),
    defineField({
      description: "Short line under the name, e.g. service area or promise.",
      initialValue:
        "Helping Central Texas homeowners through the roofing process.",
      name: "tagline",
      title: "Tagline",
      type: "string",
    }),
    defineField({
      name: "phone",
      title: "Phone",
      type: "string",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
    }),
    defineField({
      initialValue: "https://www.tandra.me",
      name: "website",
      title: "Website",
      type: "url",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
    }),
    defineGeneratedImage({
      description: "Square portrait shown next to the signature.",
      name: "headshot",
      title: "Headshot",
    }),
    defineGeneratedImage({
      description: "Birdcreek logo shown below the signature.",
      name: "companyLogo",
      title: "Company logo",
    }),
  ],
  name: "emailSignature",
  preview: {
    prepare: ({ title, subtitle }) => ({
      subtitle: subtitle || "Signature",
      title: title || "Email signature",
    }),
    select: { subtitle: "jobTitle", title: "name" },
  },
  title: "Email signature",
  type: "document",
});
