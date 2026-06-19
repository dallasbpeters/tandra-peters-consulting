import { EnvelopeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

/**
 * Editable content for a client-facing email Tandra sends (e.g. a post-inspection
 * follow-up). Rendered by the react-email template, which fetches the published
 * document from Sanity's public query API.
 */
export const clientEmailType = defineType({
  name: "clientEmail",
  title: "Client email",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: "subject",
      type: "string",
      title: "Subject line",
      initialValue: "Your roof inspection summary & next steps",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "previewText",
      type: "string",
      title: "Preview text",
      description: "The snippet shown in the inbox next to the subject.",
      initialValue: "Here's what I found on your roof and what we'll do next.",
    }),
    defineField({
      name: "greeting",
      type: "string",
      title: "Greeting",
      initialValue: "Hi there,",
    }),
    defineField({
      name: "body",
      type: "blockContent",
      title: "Body",
      description: "The main message. Keep it warm and practical.",
    }),
    defineField({
      name: "ctaLabel",
      type: "string",
      title: "Button label",
      initialValue: "View your inspection report",
    }),
    defineField({
      name: "ctaUrl",
      type: "url",
      title: "Button link",
      initialValue: "https://www.tandra.me",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
    }),
    defineField({
      name: "closing",
      type: "string",
      title: "Closing",
      description: 'Sign-off line above the signature, e.g. "Talk soon,".',
      initialValue: "Talk soon,",
    }),
    defineField({
      name: "signature",
      type: "reference",
      title: "Signature",
      to: [{ type: "emailSignature" }],
      description: "The sign-off block used at the bottom of this email.",
    }),
  ],
  preview: {
    select: { title: "subject" },
    prepare: ({ title }) => ({
      title: title || "Client email",
      subtitle: "Email",
    }),
  },
});
