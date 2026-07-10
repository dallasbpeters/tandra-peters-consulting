import { HomeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

const statusOptions = [
  { title: "Not knocked", value: "not-started" },
  { title: "No answer", value: "no-answer" },
  { title: "Talked", value: "talked" },
  { title: "Come back", value: "come-back" },
  { title: "Left a door hanger", value: "left-material" },
  { title: "Not interested", value: "not-interested" },
  { title: "Booked", value: "booked" },
  { title: "Do not contact", value: "skip" },
] as const;

/**
 * A single home's canvass state for the Desk "Walk area" view. One document per
 * home, written by `/api/desk-walk` with a deterministic id
 * (`drafts.deskWalkVisit.<targetId>.<homeKey>`) so upserts never clobber
 * sibling homes. Kept as drafts (auth-gated, out of public-read content).
 *
 * These carry NO homeowner PII — only the address key, status, and field notes.
 * The homeowner name from RentCast is stripped server-side and never stored.
 */
export const deskWalkVisitType = defineType({
  fields: [
    defineField({
      description: "Parent deskCanvassTarget _id this home belongs to.",
      name: "targetId",
      readOnly: true,
      title: "Target id",
      type: "string",
    }),
    defineField({
      description: "Stable per-home key (RentCast id or hashed address).",
      name: "homeKey",
      readOnly: true,
      title: "Home key",
      type: "string",
    }),
    defineField({
      initialValue: "not-started",
      name: "status",
      options: { layout: "radio", list: statusOptions },
      title: "Status",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description: "What happened at the door.",
      name: "notes",
      rows: 4,
      title: "Notes",
      type: "text",
      validation: (Rule) => Rule.max(1400),
    }),
    defineField({
      name: "followUpDate",
      title: "Follow-up date",
      type: "datetime",
    }),
    defineField({
      name: "createdAt",
      readOnly: true,
      title: "Created at",
      type: "datetime",
    }),
    defineField({
      name: "updatedAt",
      readOnly: true,
      title: "Updated at",
      type: "datetime",
    }),
    defineField({
      name: "createdBy",
      readOnly: true,
      title: "Created by",
      type: "string",
    }),
  ],
  icon: HomeIcon,
  name: "deskWalkVisit",
  orderings: [
    {
      by: [{ direction: "desc", field: "updatedAt" }],
      name: "updatedAtDesc",
      title: "Recently updated",
    },
  ],
  preview: {
    prepare: ({ title, status, subtitle }) => ({
      subtitle: [status, subtitle].filter(Boolean).join(" · "),
      title: title || "Walk visit",
    }),
    select: {
      status: "status",
      subtitle: "targetId",
      title: "homeKey",
    },
  },
  title: "Walk visit",
  type: "document",
});
