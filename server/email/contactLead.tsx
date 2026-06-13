import type { CSSProperties, ReactNode } from "react";

/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";

import type { ContactLeadSubmission, EmailAssets } from "./types.js";

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
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
};

const inner: CSSProperties = { padding: "28px 36px 32px" };

const labelCell: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: colors.muted,
  padding: "0 0 4px",
  margin: 0,
};

const valueText: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: colors.body,
  margin: "0 0 18px",
};

const linkStyle: CSSProperties = { color: colors.accent, textDecoration: "none" };

const buttonStyle: CSSProperties = {
  backgroundColor: colors.accent,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 22px",
  textDecoration: "none",
};

const legal: CSSProperties = {
  fontSize: "11px",
  lineHeight: "18px",
  color: "#8a958e",
  margin: "20px 0 0",
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Section>
    <Text style={labelCell}>{label}</Text>
    <Text style={valueText}>{children}</Text>
  </Section>
);

/** Split a freeform message into lines so newlines survive across email clients. */
const messageLines = (message: string): ReactNode[] => {
  const lines = message.split(/\r?\n/);
  return lines.map((line, i) => (
    <span key={i}>
      {line || "\u00a0"}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
};

const formatTimestamp = (iso?: string): string => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleString("en-US");
  return date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  });
};

/**
 * Pure, render-safe notification email sent to Tandra for each website contact
 * submission. No async/fetch inside the component so it renders identically in
 * the preview server and the `/api/contact` send.
 */
export const ContactLeadEmail = ({
  submission,
  assets,
}: {
  submission: ContactLeadSubmission;
  assets: EmailAssets;
}) => {
  const name = submission.fullName.trim() || "Website visitor";
  const service = submission.serviceLabel?.trim();
  const phone = submission.phoneNumber?.trim();
  const address = submission.propertyAddress?.trim();
  const replyHref = `mailto:${submission.email}?subject=${encodeURIComponent(
    "Re: your roofing inquiry",
  )}`;

  return (
    <Html>
      <Head />
      <Preview>{`New roofing inquiry from ${name}${service ? ` · ${service}` : ""}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "24px 36px 0" }}>
            <Img
              src={assets.headerLogoUrl}
              height="60"
              alt="Birdcreek Roofing"
              style={{ display: "block" }}
            />
          </Section>

          <Section style={inner}>
            <Heading
              as="h1"
              style={{ fontSize: "21px", color: colors.ink, margin: "0 0 6px", lineHeight: "28px" }}
            >
              New roofing inquiry
            </Heading>
            <Text style={{ fontSize: "13px", color: colors.muted, margin: "0 0 22px" }}>
              Submitted via the website contact form on {formatTimestamp(submission.submittedAt)}.
            </Text>

            <Field label="Name">{name}</Field>
            <Field label="Email">
              <Link href={`mailto:${submission.email}`} style={linkStyle}>
                {submission.email}
              </Link>
            </Field>
            {phone ? (
              <Field label="Phone">
                <Link href={`tel:${phone.replace(/[^0-9+]/g, "")}`} style={linkStyle}>
                  {phone}
                </Link>
              </Field>
            ) : null}
            {service ? <Field label="Service interest">{service}</Field> : null}
            {address ? <Field label="Property / address">{address}</Field> : null}
            <Field label="Message">{messageLines(submission.message)}</Field>

            <Section style={{ margin: "8px 0 4px" }}>
              <Button href={replyHref} style={buttonStyle}>
                Reply to {name.split(/\s+/)[0]}
              </Button>
            </Section>

            <Hr style={{ borderColor: colors.border, margin: "22px 0 0" }} />
            <Text style={legal}>
              The visitor confirmed consent to be contacted by email, phone, or SMS. Reply directly
              to this email to reach them.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

/** Render the contact-lead notification email to an HTML string for sending. */
export const renderContactLeadEmail = (submission: ContactLeadSubmission, assets: EmailAssets) =>
  render(<ContactLeadEmail submission={submission} assets={assets} />, { pretty: false });
