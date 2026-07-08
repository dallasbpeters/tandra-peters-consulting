import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import { PortableTextToEmail } from "./portableText.js";
import { sanityImage } from "./sanity.js";

const colors = {
  accent: "#3a7d5d",
  body: "#1a2b22",
  border: "#e4e8e6",
  ink: "#0f1f18",
  muted: "#5b6b62",
  page: "#f3f5f4",
  surface: "#ffffff",
};

const main = {
  backgroundColor: colors.page,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "520px",
  overflow: "hidden",
};

const inner = { padding: "32px 36px" };

const greetingStyle = {
  color: colors.body,
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const buttonStyle = {
  backgroundColor: colors.accent,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 22px",
  textDecoration: "none",
};

const closingStyle = {
  color: colors.body,
  fontSize: "15px",
  lineHeight: "26px",
  margin: "8px 0 4px",
};

const sigName = {
  color: colors.ink,
  fontSize: "16px",
  fontWeight: 700,
  margin: 0,
};

const sigRole = {
  color: colors.accent,
  fontSize: "13px",
  margin: "2px 0 0",
};

const sigTagline = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "6px 0 0",
};

const sigContact = {
  color: colors.muted,
  fontSize: "12px",
  margin: "8px 0 0",
};

const sigLink = { color: colors.accent, textDecoration: "none" };

const legal = {
  color: "#8a958e",
  fontSize: "11px",
  lineHeight: "18px",
  margin: "20px 0 0",
};

const DEFAULTS = {
  closing: "Talk soon,",
  ctaLabel: "View your inspection report",
  ctaUrl: "https://www.tandra.me",
  greeting: "Hi there,",
  subject: "Your roof inspection summary & next steps",
};

const NON_PHONE_CHARS_RE = /[^0-9+]/g;
const PROTOCOL_RE = /^https?:\/\//;

const Signature = ({ signature, assets }) => {
  const headshotUrl = signature.headshotUrl ?? assets.signatureHeadshotFallback;

  const contacts = [
    signature.phone
      ? {
          id: "phone",
          node: jsx(Link, {
            children: signature.phone,
            href: `tel:${signature.phone.replace(NON_PHONE_CHARS_RE, "")}`,
            style: sigLink,
          }),
        }
      : null,
    signature.email
      ? {
          id: "email",
          node: jsx(Link, {
            children: signature.email,
            href: `mailto:${signature.email}`,
            style: sigLink,
          }),
        }
      : null,
    signature.website
      ? {
          id: "web",
          node: jsx(Link, {
            children: signature.website.replace(PROTOCOL_RE, ""),
            href: signature.website,
            style: sigLink,
          }),
        }
      : null,
  ].filter(Boolean);

  return jsx(Section, {
    children: jsxs(Row, {
      children: [
        headshotUrl
          ? jsx(Column, {
              children: jsx(Img, {
                alt: signature.name ?? "Headshot",
                height: "56",
                src: sanityImage(headshotUrl, { fit: "crop", h: 128, w: 128 }),
                style: { borderRadius: "50%", display: "block" },
                width: "56",
              }),
              style: { verticalAlign: "top", width: "64px" },
            })
          : null,
        jsxs(Column, {
          children: [
            jsx(Text, { children: signature.name, style: sigName }),
            jsx(Text, {
              children: [signature.jobTitle, signature.company]
                .filter(Boolean)
                .join(" \u00B7 "),
              style: sigRole,
            }),
            signature.tagline
              ? jsx(Text, { children: signature.tagline, style: sigTagline })
              : null,
            contacts.length
              ? jsx(Text, {
                  children: contacts.map(({ id, node }, i) =>
                    jsxs(
                      "span",
                      {
                        children: [
                          i > 0
                            ? jsxs("span", {
                                children: [" ", "\u00A0|\u00A0", " "],
                                style: { color: colors.border },
                              })
                            : null,
                          node,
                        ],
                      },
                      id
                    )
                  ),
                  style: sigContact,
                })
              : null,
          ],
          style: {
            paddingLeft: headshotUrl ? "14px" : 0,
            verticalAlign: "top",
          },
        }),
      ],
    }),
  });
};

export const ClientEmailDocument = ({ content, assets }) => {
  const subject = content.subject?.trim() || DEFAULTS.subject;
  const previewText = content.previewText?.trim() || subject;
  const greeting = content.greeting?.trim() || DEFAULTS.greeting;
  const ctaLabel = content.ctaLabel?.trim() || DEFAULTS.ctaLabel;
  const ctaUrl = content.ctaUrl?.trim() || DEFAULTS.ctaUrl;
  const closing = content.closing?.trim() || DEFAULTS.closing;
  const signature = content.signature ?? {
    company: "Birdcreek Roofing",
    jobTitle: "Roofing Consultant",
    name: "Tandra Peters",
    tagline: "Helping Central Texas homeowners through the roofing process.",
    website: "https://www.tandra.me",
  };

  return jsxs(Html, {
    children: [
      jsx(Head, {}),
      jsx(Preview, { children: previewText }),
      jsx(Body, {
        children: jsxs(Container, {
          children: [
            jsx(Section, {
              children: jsx(Img, {
                alt: "Birdcreek Roofing",
                height: "60",
                src: assets.headerLogoUrl,
                style: { display: "block" },
              }),
              style: { padding: "24px 36px 0" },
            }),
            jsxs(Section, {
              children: [
                jsx(Heading, {
                  as: "h1",
                  children: subject,
                  style: {
                    color: colors.ink,
                    fontSize: "22px",
                    lineHeight: "30px",
                    margin: "0 0 20px",
                  },
                }),
                jsx(Text, { children: greeting, style: greetingStyle }),
                content.body?.length
                  ? jsx(PortableTextToEmail, { blocks: content.body })
                  : jsxs(Fragment, {
                      children: [
                        jsx(Text, {
                          children:
                            "Thank you for letting me take a look at your roof. I've put together a clear summary of what I found, along with photos and my honest recommendation for next steps \u2014 no pressure, just the facts you need to make a confident decision.",
                          style: greetingStyle,
                        }),
                        jsx(Text, {
                          children:
                            "Take a look whenever you have a few minutes, and reply to this email with any questions. I'm happy to walk through it with you.",
                          style: greetingStyle,
                        }),
                      ],
                    }),
                jsx(Section, {
                  children: jsx(Button, {
                    children: ctaLabel,
                    href: ctaUrl,
                    style: buttonStyle,
                  }),
                  style: { margin: "24px 0", textAlign: "center" },
                }),
                jsx(Text, { children: closing, style: closingStyle }),
                jsx(Hr, {
                  style: { borderColor: colors.border, margin: "12px 0 20px" },
                }),
                jsx(Signature, { assets, signature }),
                jsx(Text, {
                  children:
                    "You're receiving this because you requested a roof inspection or consultation with Birdcreek Roofing. If this reached you by mistake, just reply and let me know.",
                  style: legal,
                }),
              ],
              style: inner,
            }),
          ],
          style: container,
        }),
        style: main,
      }),
    ],
  });
};

export const renderClientEmail = (content, assets) =>
  render(jsx(ClientEmailDocument, { assets, content }), {
    pretty: false,
  });
