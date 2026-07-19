import { DocumentsIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A saved photo report and its version history. Written by `/api/reports`
 * (Google-auth gated), not edited by hand here. Binary assets (downscaled
 * photos, rendered PDF, preview thumbnail) live in Vercel Blob; this document
 * stores their URLs plus the serialized editable report state per version.
 */
export const reportDocumentType = defineType({
  icon: DocumentsIcon,
  fields: [
    defineField({
      name: "title",
      title: "Report title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "propertyAddress",
      title: "Property address",
      type: "string",
    }),
    defineField({
      name: "updatedAt",
      title: "Last saved",
      type: "datetime",
    }),
    defineField({
      name: "savedBy",
      readOnly: true,
      title: "Owner",
      type: "string",
    }),
    defineField({
      description: "Append-only version snapshots (newest last).",
      name: "versions",
      of: [
        defineArrayMember({
          fields: [
            defineField({
              name: "versionNumber",
              title: "Version",
              type: "number",
            }),
            defineField({
              name: "savedAt",
              title: "Saved at",
              type: "datetime",
            }),
            defineField({ name: "savedBy", title: "Saved by", type: "string" }),
            defineField({
              description: "Serialized report editor state (JSON).",
              name: "report",
              rows: 8,
              title: "Report state (JSON)",
              type: "text",
            }),
            defineField({
              name: "pdfUrl",
              title: "PDF (Vercel Blob URL)",
              type: "url",
            }),
            defineField({
              name: "previewUrl",
              title: "Preview thumbnail URL",
              type: "url",
            }),
            defineField({
              name: "driveFileId",
              title: "Google Drive file id",
              type: "string",
            }),
            defineField({
              name: "driveWebViewLink",
              title: "Google Drive link",
              type: "url",
            }),
          ],
          name: "reportVersion",
          preview: {
            prepare: ({ subtitle, title }) => ({
              subtitle: subtitle ? new Date(subtitle).toLocaleString() : "",
              title: `Version ${title ?? "?"}`,
            }),
            select: { subtitle: "savedAt", title: "versionNumber" },
          },
          type: "object",
        }),
      ],
      title: "Versions",
      type: "array",
    }),
  ],
  name: "reportDocument",
  orderings: [
    {
      by: [{ direction: "desc", field: "updatedAt" }],
      name: "updatedAtDesc",
      title: "Last saved (newest)",
    },
  ],
  preview: {
    prepare: ({ subtitle, title }) => ({
      subtitle: subtitle ? new Date(subtitle).toLocaleString() : "Draft",
      title: title ?? "Untitled report",
    }),
    select: { subtitle: "updatedAt", title: "title" },
  },
  title: "Photo report",
  type: "document",
});
