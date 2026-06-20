/** @jsxRuntime automatic */
/** @jsxImportSource react */
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
import type { CSSProperties } from "react";

import { PortableTextToEmail } from "./portableText.js";
import { sanityImage } from "./sanity.js";
import type {
  ClientEmailContent,
  EmailAssets,
  EmailSignature,
} from "./types.js";

const colors = {
  ink: "#0f1f18",
  body: "#1a2b22",
  muted: "#5b6b62",
  accent: "#3a7d5d",
  border: "#e4e8e6",
  surface: "#ffffff",
  page: "#f3f5f4",
};

const main: CSSProperties = {
  backgroundColor: colors.page,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "520px",
  overflow: "hidden",
};

const inner: CSSProperties = { padding: "32px 36px" };

const greetingStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: "26px",
  color: colors.body,
  margin: "0 0 16px",
};

const buttonStyle: CSSProperties = {
  backgroundColor: colors.accent,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 22px",
  textDecoration: "none",
};

const closingStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: "26px",
  color: colors.body,
  margin: "8px 0 4px",
};

const sigName: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: colors.ink,
  margin: 0,
};
const sigRole: CSSProperties = {
  fontSize: "13px",
  color: colors.accent,
  margin: "2px 0 0",
};
const sigTagline: CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: colors.muted,
  margin: "6px 0 0",
};
const sigContact: CSSProperties = {
  fontSize: "12px",
  color: colors.muted,
  margin: "8px 0 0",
};
const sigLink: CSSProperties = { color: colors.accent, textDecoration: "none" };
const legal: CSSProperties = {
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
} as const;

const NON_PHONE_CHARS_RE = /[^0-9+]/g;
const PROTOCOL_RE = /^https?:\/\//;

const Signature = ({
  signature,
  assets,
}: {
  signature: EmailSignature;
  assets: EmailAssets;
}) => {
  const headshotUrl = signature.headshotUrl ?? assets.signatureHeadshotFallback;

  const contacts = [
    signature.phone
      ? {
          id: "phone",
          node: (
            <Link
              href={`tel:${signature.phone.replace(NON_PHONE_CHARS_RE, "")}`}
              style={sigLink}
            >
              {signature.phone}
            </Link>
          ),
        }
      : null,
    signature.email
      ? {
          id: "email",
          node: (
            <Link href={`mailto:${signature.email}`} style={sigLink}>
              {signature.email}
            </Link>
          ),
        }
      : null,
    signature.website
      ? {
          id: "web",
          node: (
            <Link href={signature.website} style={sigLink}>
              {signature.website.replace(PROTOCOL_RE, "")}
            </Link>
          ),
        }
      : null,
  ].filter(Boolean) as { id: string; node: React.ReactNode }[];

  return (
    <Section>
      <Row>
        {headshotUrl ? (
          <Column style={{ width: "64px", verticalAlign: "top" }}>
            <Img
              alt={signature.name ?? "Headshot"}
              height="56"
              src={sanityImage(headshotUrl, { w: 128, h: 128, fit: "crop" })}
              style={{ borderRadius: "50%", display: "block" }}
              width="56"
            />
          </Column>
        ) : null}
        <Column
          style={{
            verticalAlign: "top",
            paddingLeft: headshotUrl ? "14px" : 0,
          }}
        >
          <Text style={sigName}>{signature.name}</Text>
          <Text style={sigRole}>
            {[signature.jobTitle, signature.company]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {signature.tagline ? (
            <Text style={sigTagline}>{signature.tagline}</Text>
          ) : null}
          {contacts.length ? (
            <Text style={sigContact}>
              {contacts.map(({ id, node }, i) => (
                <span key={id}>
                  {i > 0 ? (
                    <span style={{ color: colors.border }}>
                      {" "}
                      &nbsp;|&nbsp;{" "}
                    </span>
                  ) : null}
                  {node}
                </span>
              ))}
            </Text>
          ) : null}
        </Column>
      </Row>
    </Section>
  );
};

/**
 * Pure, render-safe client email. Content is resolved up front (no async/fetch
 * inside the component) so it renders identically in the preview server, the
 * Vercel render endpoint, and the actual send.
 */
export const ClientEmailDocument = ({
  content,
  assets,
}: {
  content: ClientEmailContent;
  assets: EmailAssets;
}) => {
  const subject = content.subject?.trim() || DEFAULTS.subject;
  const previewText = content.previewText?.trim() || subject;
  const greeting = content.greeting?.trim() || DEFAULTS.greeting;
  const ctaLabel = content.ctaLabel?.trim() || DEFAULTS.ctaLabel;
  const ctaUrl = content.ctaUrl?.trim() || DEFAULTS.ctaUrl;
  const closing = content.closing?.trim() || DEFAULTS.closing;
  const signature: EmailSignature = content.signature ?? {
    name: "Tandra Peters",
    jobTitle: "Roofing Consultant",
    company: "Birdcreek Roofing",
    tagline: "Helping Central Texas homeowners through the roofing process.",
    website: "https://www.tandra.me",
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "24px 36px 0" }}>
            <Img
              alt="Birdcreek Roofing"
              height="60"
              src={assets.headerLogoUrl}
              style={{ display: "block" }}
            />
          </Section>

          <Section style={inner}>
            <Heading
              as="h1"
              style={{
                fontSize: "22px",
                color: colors.ink,
                margin: "0 0 20px",
                lineHeight: "30px",
              }}
            >
              {subject}
            </Heading>

            <Text style={greetingStyle}>{greeting}</Text>

            {content.body?.length ? (
              <PortableTextToEmail blocks={content.body} />
            ) : (
              <>
                <Text style={greetingStyle}>
                  Thank you for letting me take a look at your roof. I&apos;ve
                  put together a clear summary of what I found, along with
                  photos and my honest recommendation for next steps — no
                  pressure, just the facts you need to make a confident
                  decision.
                </Text>
                <Text style={greetingStyle}>
                  Take a look whenever you have a few minutes, and reply to this
                  email with any questions. I&apos;m happy to walk through it
                  with you.
                </Text>
              </>
            )}

            <Section style={{ margin: "24px 0", textAlign: "center" }}>
              <Button href={ctaUrl} style={buttonStyle}>
                {ctaLabel}
              </Button>
            </Section>

            <Text style={closingStyle}>{closing}</Text>

            <Hr style={{ borderColor: colors.border, margin: "12px 0 20px" }} />

            <Signature assets={assets} signature={signature} />

            <Text style={legal}>
              You&apos;re receiving this because you requested a roof inspection
              or consultation with Birdcreek Roofing. If this reached you by
              mistake, just reply and let me know.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

/** Render the client email to an HTML string for preview or sending. */
export const renderClientEmail = (
  content: ClientEmailContent,
  assets: EmailAssets
) =>
  render(<ClientEmailDocument assets={assets} content={content} />, {
    pretty: false,
  });
