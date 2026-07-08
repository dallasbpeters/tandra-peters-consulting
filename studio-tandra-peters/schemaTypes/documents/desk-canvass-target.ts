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
  fields: [
    defineField({
      description: "e.g. “Serenada — walk Saturday”.",
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      initialValue: "planned",
      name: "status",
      options: { layout: "radio", list: statusOptions },
      title: "Status",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description: "Estimated owner-occupied older homes across the selection.",
      name: "homesTotal",
      title: "Homes to canvass",
      type: "number",
    }),
    defineField({
      name: "neighborhoods",
      of: [
        defineArrayMember({
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
          name: "neighborhood",
          preview: {
            prepare: ({ title, subtitle, homes }) => ({
              subtitle: [subtitle, homes ? `${homes} homes` : null]
                .filter(Boolean)
                .join(" · "),
              title: title || "Neighborhood",
            }),
            select: {
              homes: "homes",
              subtitle: "county",
              title: "neighborhood",
            },
          },
          title: "Neighborhood",
          type: "object",
        }),
      ],
      title: "Neighborhoods",
      type: "array",
    }),
    defineField({
      name: "notes",
      rows: 3,
      title: "Notes",
      type: "text",
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
  icon: PinIcon,
  name: "deskCanvassTarget",
  orderings: [
    {
      by: [{ direction: "desc", field: "updatedAt" }],
      name: "updatedAtDesc",
      title: "Recently updated",
    },
    {
      by: [{ direction: "asc", field: "status" }],
      name: "statusAsc",
      title: "Status",
    },
  ],
  preview: {
    prepare: ({ title, status, homes }) => ({
      subtitle: [status, homes ? `${homes} homes` : null]
        .filter(Boolean)
        .join(" · "),
      title: title || "Canvassing target",
    }),
    select: {
      homes: "homesTotal",
      status: "status",
      title: "name",
    },
  },
  title: "Canvassing target",
  type: "document",
});
