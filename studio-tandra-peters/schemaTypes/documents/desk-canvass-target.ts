import { PinIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

const statusOptions = [
  { title: "Planned", value: "planned" },
  { title: "Walking", value: "walking" },
  { title: "Done", value: "done" },
] as const;

/**
 * A saved door-hanger canvassing target: a named set of neighborhoods (Census
 * tracts) Tandra plans to walk. Created from the Desk canvassing planner by
 * `/api/desk-targets`, written as drafts so they stay out of public-read content.
 *
 * These hold no homeowner PII — only aggregate neighborhood signals (estimated
 * owner-occupied older-home counts) used to prioritize where to hang door hangers.
 */
export const deskCanvassTargetType = defineType({
  name: "deskCanvassTarget",
  title: "Canvassing target",
  type: "document",
  icon: PinIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "e.g. “Serenada — walk Saturday”.",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      initialValue: "planned",
      options: { layout: "radio", list: statusOptions },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "homesTotal",
      title: "Homes to canvass",
      type: "number",
      description: "Estimated owner-occupied older homes across the selection.",
    }),
    defineField({
      name: "neighborhoods",
      title: "Neighborhoods",
      type: "array",
      of: [
        defineArrayMember({
          name: "neighborhood",
          title: "Neighborhood",
          type: "object",
          fields: [
            defineField({
              name: "tractFips",
              title: "Tract FIPS",
              type: "string",
            }),
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({
              name: "neighborhood",
              title: "Neighborhood",
              type: "string",
            }),
            defineField({ name: "county", title: "County", type: "string" }),
            defineField({ name: "postalCode", title: "ZIP", type: "string" }),
            defineField({ name: "homes", title: "Homes", type: "number" }),
            defineField({
              name: "latitude",
              title: "Latitude",
              type: "number",
            }),
            defineField({
              name: "longitude",
              title: "Longitude",
              type: "number",
            }),
          ],
          preview: {
            select: {
              title: "neighborhood",
              subtitle: "county",
              homes: "homes",
            },
            prepare: ({ title, subtitle, homes }) => ({
              title: title || "Neighborhood",
              subtitle: [subtitle, homes ? `${homes} homes` : null]
                .filter(Boolean)
                .join(" · "),
            }),
          },
        }),
      ],
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "updatedAt",
      title: "Updated at",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "createdBy",
      title: "Created by",
      type: "string",
      readOnly: true,
    }),
  ],
  orderings: [
    {
      name: "updatedAtDesc",
      title: "Recently updated",
      by: [{ field: "updatedAt", direction: "desc" }],
    },
    {
      name: "statusAsc",
      title: "Status",
      by: [{ field: "status", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "name",
      status: "status",
      homes: "homesTotal",
    },
    prepare: ({ title, status, homes }) => ({
      title: title || "Canvassing target",
      subtitle: [status, homes ? `${homes} homes` : null]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
