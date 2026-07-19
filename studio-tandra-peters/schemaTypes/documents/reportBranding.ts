import { DocumentPdfIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const reportBrandingType = defineType({
  icon: DocumentPdfIcon,
  fields: [
    defineField({
      description: "Shown on the report cover page.",
      name: "logo",
      title: "Report logo",
      type: "image",
    }),
    defineField({
      description: "Small print in the running footer of every page.",
      name: "footerText",
      title: "Footer text",
      type: "string",
    }),
    defineField({ name: "phone", title: "Phone", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "website", title: "Website", type: "url" }),
    defineField({ name: "address", rows: 2, title: "Address", type: "text" }),
    defineField({
      description: "Optional hex override; defaults to the site brand green.",
      name: "colorPrimary",
      title: "Primary color (optional)",
      type: "string",
    }),
    defineField({
      description: "Optional hex override; defaults to the site accent.",
      name: "colorAccent",
      title: "Accent color (optional)",
      type: "string",
    }),
    defineField({
      description: "Optional hex override; defaults to near-black body text.",
      name: "colorText",
      title: "Text color (optional)",
      type: "string",
    }),
  ],
  name: "reportBranding",
  preview: {
    prepare: () => ({ title: "Report branding" }),
  },
  title: "Report branding",
  type: "document",
});
