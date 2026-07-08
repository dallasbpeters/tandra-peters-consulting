import { UserIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

/**
 * A person who reached out through the website contact form. Created and updated
 * by `/api/contact` on each submission (deduped by email) and used as a source
 * for the email composer's recipient list.
 *
 * These documents are written as DRAFTS and never published, so the lead's PII
 * (email, phone, address) stays out of the public-read `production` dataset —
 * only requests carrying a Sanity token (the Studio, the auth-gated composer
 * endpoints) can read them.
 */
export const emailContactType = defineType({
  fields: [
    defineField({
      name: "fullName",
      title: "Name",
      type: "string",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "phoneNumber",
      title: "Phone",
      type: "string",
    }),
    defineField({
      name: "propertyAddress",
      title: "Property address",
      type: "string",
    }),
    defineField({
      name: "serviceInterest",
      title: "Service interest",
      type: "string",
    }),
    defineField({
      description: "The message from their most recent submission.",
      name: "latestMessage",
      rows: 4,
      title: "Latest message",
      type: "text",
    }),
    defineField({
      description:
        "Untick to leave this contact out of the email composer's recipient list.",
      initialValue: true,
      name: "subscribed",
      title: "Subscribed",
      type: "boolean",
    }),
    defineField({
      initialValue: "Website contact form",
      name: "source",
      readOnly: true,
      title: "Source",
      type: "string",
    }),
    defineField({
      description: "How many times they've used the contact form.",
      name: "submissionCount",
      readOnly: true,
      title: "Submissions",
      type: "number",
    }),
    defineField({
      name: "firstContactedAt",
      readOnly: true,
      title: "First contacted",
      type: "datetime",
    }),
    defineField({
      name: "lastContactedAt",
      readOnly: true,
      title: "Last contacted",
      type: "datetime",
    }),
  ],
  icon: UserIcon,
  name: "emailContact",
  orderings: [
    {
      by: [{ direction: "desc", field: "lastContactedAt" }],
      name: "lastContactedDesc",
      title: "Most recent",
    },
    {
      by: [{ direction: "asc", field: "fullName" }],
      name: "nameAsc",
      title: "Name (A–Z)",
    },
  ],
  preview: {
    prepare: ({ title, email, service }) => ({
      subtitle: [email, service].filter(Boolean).join(" · "),
      title: title || email || "Contact",
    }),
    select: { email: "email", service: "serviceInterest", title: "fullName" },
  },
  title: "Contact",
  type: "document",
});
