import { CheckmarkCircleIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

const kindOptions = [
  { title: "Work task", value: "task" },
  { title: "Content calendar entry", value: "content" },
] as const;

const originOptions = [
  { title: "Seed", value: "seed" },
  { title: "Generated", value: "generated" },
  { title: "Manual", value: "manual" },
] as const;

const statusOptions = [
  { title: "To do", value: "todo" },
  { title: "Done", value: "done" },
  { title: "Idea", value: "idea" },
  { title: "Scheduled", value: "scheduled" },
  { title: "Published", value: "published" },
] as const;

const buyerStageOptions = [
  { title: "Awareness", value: "awareness" },
  { title: "Consideration", value: "consideration" },
  { title: "Decision", value: "decision" },
  { title: "Retention", value: "retention" },
] as const;

export const deskBoardItemType = defineType({
  fields: [
    defineField({
      initialValue: "task",
      name: "kind",
      options: { layout: "radio", list: kindOptions },
      title: "Kind",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "detail",
      rows: 3,
      title: "Detail",
      type: "text",
    }),
    defineField({
      name: "channel",
      title: "Channel or content type",
      type: "string",
    }),
    defineField({
      name: "href",
      title: "Deep link",
      type: "string",
    }),
    defineField({
      initialValue: "todo",
      name: "status",
      options: { layout: "radio", list: statusOptions },
      title: "Status",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      initialValue: "manual",
      name: "origin",
      options: { layout: "radio", list: originOptions },
      title: "Origin",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "seedKey",
      readOnly: true,
      title: "Seed key",
      type: "string",
    }),
    defineField({
      hidden: ({ parent }) => parent?.kind !== "content",
      name: "pillar",
      title: "Content pillar",
      type: "string",
    }),
    defineField({
      hidden: ({ parent }) => parent?.kind !== "content",
      name: "buyerStage",
      options: { layout: "radio", list: buyerStageOptions },
      title: "Buyer stage",
      type: "string",
    }),
    defineField({
      hidden: ({ parent }) => parent?.kind !== "content",
      name: "publishDate",
      title: "Publish date",
      type: "date",
    }),
    defineField({
      name: "createdBy",
      readOnly: true,
      title: "Created by",
      type: "string",
    }),
    defineField({
      name: "createdAt",
      readOnly: true,
      title: "Created at",
      type: "datetime",
    }),
    defineField({
      name: "completedAt",
      readOnly: true,
      title: "Completed at",
      type: "datetime",
    }),
    defineField({
      name: "updatedAt",
      readOnly: true,
      title: "Updated at",
      type: "datetime",
    }),
  ],
  icon: CheckmarkCircleIcon,
  name: "deskBoardItem",
  preview: {
    prepare({ title, kind, status, publishDate }) {
      const kindLabel = kind === "content" ? "Content" : "Task";
      const suffix = publishDate ? ` - ${publishDate}` : "";
      return {
        subtitle: `${kindLabel} - ${status ?? "todo"}${suffix}`,
        title: title ?? "Untitled board item",
      };
    },
    select: {
      kind: "kind",
      publishDate: "publishDate",
      status: "status",
      title: "title",
    },
  },
  title: "Desk board item",
  type: "document",
});
