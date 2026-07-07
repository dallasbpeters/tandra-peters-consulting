import { UserIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

const sourceOptions = [
  { title: "Neighbor referral", value: "neighbor-referral" },
  { title: "Postcard", value: "postcard" },
  { title: "Neighborhood post", value: "neighborhood-post" },
  { title: "Google post", value: "google-post" },
  { title: "Partner referral", value: "partner" },
  { title: "Roof-check page", value: "roof-check-page" },
  { title: "Website estimate", value: "website-estimate" },
  { title: "Other", value: "other" },
] as const;

const nextStepOptions = [
  { title: "Call today", value: "call-today" },
  { title: "Send checklist", value: "send-checklist" },
  { title: "Book inspection", value: "book-inspection" },
  { title: "Ask for photos", value: "ask-for-photos" },
  { title: "No action yet", value: "no-action-yet" },
] as const;

const statusOptions = [
  { title: "New", value: "new" },
  { title: "Working", value: "working" },
  { title: "Booked", value: "booked" },
  { title: "Closed", value: "closed" },
] as const;

/**
 * Private lead records captured from Desk. These are written as drafts by
 * `/api/desk-capture`, keeping homeowner details out of public-read content.
 */
export const deskLeadType = defineType({
  fields: [
    defineField({
      name: "contactName",
      title: "Name or address",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "contactMethod",
      title: "Phone or email",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "email",
      readOnly: true,
      title: "Parsed email",
      type: "string",
    }),
    defineField({
      name: "phone",
      readOnly: true,
      title: "Parsed phone",
      type: "string",
    }),
    defineField({
      name: "area",
      title: "Neighborhood / city",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "need",
      rows: 4,
      title: "What needs follow-up",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "notes",
      rows: 4,
      title: "Notes",
      type: "text",
    }),
    defineField({
      initialValue: "other",
      name: "source",
      options: { layout: "radio", list: sourceOptions },
      title: "Where it came from",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      initialValue: "call-today",
      name: "nextStep",
      options: { layout: "radio", list: nextStepOptions },
      title: "Next step",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      initialValue: "new",
      name: "status",
      options: { layout: "radio", list: statusOptions },
      title: "Status",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "capturedAt",
      readOnly: true,
      title: "Captured at",
      type: "datetime",
    }),
    defineField({
      name: "capturedBy",
      readOnly: true,
      title: "Captured by",
      type: "string",
    }),
  ],
  icon: UserIcon,
  name: "deskLead",
  orderings: [
    {
      by: [{ direction: "desc", field: "capturedAt" }],
      name: "capturedAtDesc",
      title: "Newest captured",
    },
    {
      by: [{ direction: "asc", field: "status" }],
      name: "statusAsc",
      title: "Status",
    },
  ],
  preview: {
    prepare: ({ area, capturedAt, source, title }) => ({
      subtitle: [area, source, capturedAt].filter(Boolean).join(" · "),
      title: title || "Desk lead",
    }),
    select: {
      area: "area",
      capturedAt: "capturedAt",
      source: "source",
      title: "contactName",
    },
  },
  title: "Desk lead",
  type: "document",
});
