import { EnvelopeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

/**
 * Editable content for a client-facing email Tandra sends (e.g. a post-inspection
 * follow-up). Rendered by the react-email template, which fetches the published
 * document from Sanity's public query API.
 */
export const clientEmailType = defineType({
  fields: [
    defineField({
      initialValue: "Your roof inspection summary & next steps",
      name: "subject",
      title: "Subject line",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      description: "The snippet shown in the inbox next to the subject.",
      initialValue: "Here's what I found on your roof and what we'll do next.",
      name: "previewText",
      title: "Preview text",
      type: "string",
    }),
    defineField({
      initialValue: "Hi there,",
      name: "greeting",
      title: "Greeting",
      type: "string",
    }),
    defineField({
      description: "The main message. Keep it warm and practical.",
      name: "body",
      title: "Body",
      type: "blockContent",
    }),
    defineField({
      initialValue: "View your inspection report",
      name: "ctaLabel",
      title: "Button label",
      type: "string",
    }),
    defineField({
      initialValue: "https://www.tandra.me",
      name: "ctaUrl",
      title: "Button link",
      type: "url",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
    }),
    defineField({
      description: 'Sign-off line above the signature, e.g. "Talk soon,".',
      initialValue: "Talk soon,",
      name: "closing",
      title: "Closing",
      type: "string",
    }),
    defineField({
      description: "The sign-off block used at the bottom of this email.",
      name: "signature",
      title: "Signature",
      to: [{ type: "emailSignature" }],
      type: "reference",
    }),
  ],
  icon: EnvelopeIcon,
  name: "clientEmail",
  preview: {
    prepare: ({ title }) => ({
      subtitle: "Email",
      title: title || "Client email",
    }),
    select: { title: "subject" },
  },
  title: "Client email",
  type: "document",
});
