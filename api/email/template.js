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
  ink: "#0f1f18",
  body: "#1a2b22",
  muted: "#5b6b62",
  accent: "#3a7d5d",
  border: "#e4e8e6",
  surface: "#ffffff",
  page: "#f3f5f4",
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
  fontSize: "15px",
  lineHeight: "26px",
  color: colors.body,
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
  fontSize: "15px",
  lineHeight: "26px",
  color: colors.body,
  margin: "8px 0 4px",
};

const sigName = {
  fontSize: "16px",
  fontWeight: 700,
  color: colors.ink,
  margin: 0,
};

const sigRole = {
  fontSize: "13px",
  color: colors.accent,
  margin: "2px 0 0",
};

const sigTagline = {
  fontSize: "12px",
  lineHeight: "18px",
  color: colors.muted,
  margin: "6px 0 0",
};

const sigContact = {
  fontSize: "12px",
  color: colors.muted,
  margin: "8px 0 0",
};

const sigLink = { color: colors.accent, textDecoration: "none" };

const legal = {
  fontSize: "11px",
  lineHeight: "18px",
  color: "#8a958e",
  margin: "20px 0 0",
};

const DEFAULTS = {
  subject: "Your roof inspection summary & next steps",
  greeting: "Hi there,",
  ctaLabel: "View your inspection report",
  ctaUrl: "https://www.tandra.me",
  closing: "Talk soon,",
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
            href: `tel:${signature.phone.replace(NON_PHONE_CHARS_RE, "")}`,
            style: sigLink,
            children: signature.phone,
          }),
        }
      : null,
    signature.email
      ? {
          id: "email",
          node: jsx(Link, {
            href: `mailto:${signature.email}`,
            style: sigLink,
            children: signature.email,
          }),
        }
      : null,
    signature.website
      ? {
          id: "web",
          node: jsx(Link, {
            href: signature.website,
            style: sigLink,
            children: signature.website.replace(PROTOCOL_RE, ""),
          }),
        }
      : null,
  ].filter(Boolean);

  return jsx(Section, {
    children: jsxs(Row, {
      children: [
        headshotUrl
          ? jsx(Column, {
              style: { width: "64px", verticalAlign: "top" },
              children: jsx(Img, {
                alt: signature.name ?? "Headshot",
                height: "56",
                src: sanityImage(headshotUrl, { w: 128, h: 128, fit: "crop" }),
                style: { borderRadius: "50%", display: "block" },
                width: "56",
              }),
            })
          : null,
        jsxs(Column, {
          style: {
            verticalAlign: "top",
            paddingLeft: headshotUrl ? "14px" : 0,
          },
          children: [
            jsx(Text, { style: sigName, children: signature.name }),
            jsx(Text, {
              style: sigRole,
              children: [signature.jobTitle, signature.company]
                .filter(Boolean)
                .join(" \u00b7 "),
            }),
            signature.tagline
              ? jsx(Text, { style: sigTagline, children: signature.tagline })
              : null,
            contacts.length
              ? jsx(Text, {
                  style: sigContact,
                  children: contacts.map(({ id, node }, i) =>
                    jsxs(
                      "span",
                      {
                        children: [
                          i > 0
                            ? jsxs("span", {
                                style: { color: colors.border },
                                children: [" ", "\u00a0|\u00a0", " "],
                              })
                            : null,
                          node,
                        ],
                      },
                      id
                    )
                  ),
                })
              : null,
          ],
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
    name: "Tandra Peters",
    jobTitle: "Roofing Consultant",
    company: "Birdcreek Roofing",
    tagline: "Helping Central Texas homeowners through the roofing process.",
    website: "https://www.tandra.me",
  };

  return jsxs(Html, {
    children: [
      jsx(Head, {}),
      jsx(Preview, { children: previewText }),
      jsx(Body, {
        style: main,
        children: jsxs(Container, {
          style: container,
          children: [
            jsx(Section, {
              style: { padding: "24px 36px 0" },
              children: jsx(Img, {
                alt: "Birdcreek Roofing",
                height: "60",
                src: assets.headerLogoUrl,
                style: { display: "block" },
              }),
            }),
            jsxs(Section, {
              style: inner,
              children: [
                jsx(Heading, {
                  as: "h1",
                  style: {
                    fontSize: "22px",
                    color: colors.ink,
                    margin: "0 0 20px",
                    lineHeight: "30px",
                  },
                  children: subject,
                }),
                jsx(Text, { style: greetingStyle, children: greeting }),
                content.body?.length
                  ? jsx(PortableTextToEmail, { blocks: content.body })
                  : jsxs(Fragment, {
                      children: [
                        jsx(Text, {
                          style: greetingStyle,
                          children:
                            "Thank you for letting me take a look at your roof. I've put together a clear summary of what I found, along with photos and my honest recommendation for next steps \u2014 no pressure, just the facts you need to make a confident decision.",
                        }),
                        jsx(Text, {
                          style: greetingStyle,
                          children:
                            "Take a look whenever you have a few minutes, and reply to this email with any questions. I'm happy to walk through it with you.",
                        }),
                      ],
                    }),
                jsx(Section, {
                  style: { margin: "24px 0", textAlign: "center" },
                  children: jsx(Button, {
                    href: ctaUrl,
                    style: buttonStyle,
                    children: ctaLabel,
                  }),
                }),
                jsx(Text, { style: closingStyle, children: closing }),
                jsx(Hr, {
                  style: { borderColor: colors.border, margin: "12px 0 20px" },
                }),
                jsx(Signature, { assets, signature }),
                jsx(Text, {
                  style: legal,
                  children:
                    "You're receiving this because you requested a roof inspection or consultation with Birdcreek Roofing. If this reached you by mistake, just reply and let me know.",
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
};

export const renderClientEmail = (content, assets) =>
  render(jsx(ClientEmailDocument, { assets, content }), {
    pretty: false,
  });
