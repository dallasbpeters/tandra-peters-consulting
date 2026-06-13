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
  name: "emailContact",
  title: "Contact",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "fullName",
      type: "string",
      title: "Name",
    }),
    defineField({
      name: "email",
      type: "string",
      title: "Email",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "phoneNumber",
      type: "string",
      title: "Phone",
    }),
    defineField({
      name: "propertyAddress",
      type: "string",
      title: "Property address",
    }),
    defineField({
      name: "serviceInterest",
      type: "string",
      title: "Service interest",
    }),
    defineField({
      name: "latestMessage",
      type: "text",
      rows: 4,
      title: "Latest message",
      description: "The message from their most recent submission.",
    }),
    defineField({
      name: "subscribed",
      type: "boolean",
      title: "Subscribed",
      description: "Untick to leave this contact out of the email composer's recipient list.",
      initialValue: true,
    }),
    defineField({
      name: "source",
      type: "string",
      title: "Source",
      initialValue: "Website contact form",
      readOnly: true,
    }),
    defineField({
      name: "submissionCount",
      type: "number",
      title: "Submissions",
      description: "How many times they've used the contact form.",
      readOnly: true,
    }),
    defineField({
      name: "firstContactedAt",
      type: "datetime",
      title: "First contacted",
      readOnly: true,
    }),
    defineField({
      name: "lastContactedAt",
      type: "datetime",
      title: "Last contacted",
      readOnly: true,
    }),
  ],
  orderings: [
    {
      name: "lastContactedDesc",
      title: "Most recent",
      by: [{ field: "lastContactedAt", direction: "desc" }],
    },
    {
      name: "nameAsc",
      title: "Name (A–Z)",
      by: [{ field: "fullName", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "fullName", email: "email", service: "serviceInterest" },
    prepare: ({ title, email, service }) => ({
      title: title || email || "Contact",
      subtitle: [email, service].filter(Boolean).join(" · "),
    }),
  },
});
