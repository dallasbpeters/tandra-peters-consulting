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

import type { EmailAssets, EstimateSubmission } from "./types.js";

const colors = {
  accent: "#3a7d5d",
  body: "#1a2b22",
  border: "#e4e8e6",
  ink: "#0f1f18",
  muted: "#5b6b62",
  page: "#f3f5f4",
  surface: "#ffffff",
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
  maxWidth: "560px",
  overflow: "hidden",
};

const inner: CSSProperties = { padding: "28px 36px 32px" };

const rangeBox: CSSProperties = {
  backgroundColor: "#eef4f0",
  borderRadius: "10px",
  margin: "0 0 22px",
  padding: "22px 24px",
  textAlign: "center",
};

const labelCell: CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  color: colors.muted,
  fontSize: "13px",
  padding: "8px 0",
};

const valueCell: CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  color: colors.body,
  fontSize: "13px",
  fontWeight: 700,
  padding: "8px 0",
  textAlign: "right",
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

const legal: CSSProperties = {
  color: "#8a958e",
  fontSize: "11px",
  lineHeight: "18px",
  margin: "20px 0 0",
};

const WHITESPACE_RE = /\s+/;

const AnswerRows = ({
  answers,
}: {
  answers: EstimateSubmission["answers"];
}) => (
  <Section style={{ margin: "0 0 8px" }}>
    {answers.map((row) => (
      <Row key={row.prompt}>
        <Column style={labelCell}>{row.prompt}</Column>
        <Column style={valueCell}>{row.answer}</Column>
      </Row>
    ))}
  </Section>
);

type Variant = "visitor" | "lead";

/**
 * Pure, render-safe estimate email. `visitor` is sent to the person who used the
 * estimator; `lead` is the notification sent to Tandra. The estimate is always
 * shown as a RANGE, never a single number.
 */
export const EstimateEmail = ({
  submission,
  assets,
  variant,
  scheduleUrl = "https://www.tandra.me/#contact",
}: {
  submission: EstimateSubmission;
  assets: EmailAssets;
  variant: Variant;
  scheduleUrl?: string;
}) => {
  const firstName =
    submission.fullName.trim().split(WHITESPACE_RE)[0] || "there";
  const isVisitor = variant === "visitor";

  const previewText = isVisitor
    ? `Your roof estimate: roughly ${submission.rangeDisplay}`
    : `New estimate lead · ${submission.fullName} · ${submission.rangeDisplay}`;

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
                color: colors.ink,
                fontSize: "21px",
                lineHeight: "28px",
                margin: "0 0 6px",
              }}
            >
              {isVisitor
                ? `Here's your rough estimate, ${firstName}`
                : "New estimate lead"}
            </Heading>
            <Text
              style={{
                color: colors.muted,
                fontSize: "13px",
                margin: "0 0 18px",
              }}
            >
              {isVisitor
                ? "Thanks for using the roof estimator. Here's roughly what you'll spend based on your answers."
                : `${submission.fullName} (${submission.email}) just completed the estimator.`}
            </Text>

            <Section style={rangeBox}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  margin: "0 0 4px",
                  textTransform: "uppercase",
                }}
              >
                Estimated range
              </Text>
              <Text
                style={{
                  color: colors.ink,
                  fontSize: "28px",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                {submission.rangeDisplay}
              </Text>
            </Section>

            <AnswerRows answers={submission.answers} />

            {isVisitor ? (
              <>
                <Text
                  style={{
                    color: colors.body,
                    fontSize: "14px",
                    lineHeight: "22px",
                    margin: "18px 0",
                  }}
                >
                  {`This is a ballpark only—your real quote depends on materials, pitch, access, and what we find once we're up on the roof. Want a precise number? Let's set up a free look.`}
                </Text>
                <Section style={{ margin: "4px 0" }}>
                  <Button href={scheduleUrl} style={buttonStyle}>
                    Schedule a free inspection
                  </Button>
                </Section>
                <Hr
                  style={{ borderColor: colors.border, margin: "22px 0 0" }}
                />
                <Text style={legal}>
                  — Tandra Peters, Roofing Consultant · Birdcreek Roofing
                </Text>
              </>
            ) : (
              <>
                <Section style={{ margin: "8px 0 4px" }}>
                  <Button
                    href={`mailto:${submission.email}?subject=${encodeURIComponent("Your roof estimate")}`}
                    style={buttonStyle}
                  >
                    Reply to {firstName}
                  </Button>
                </Section>
                <Hr
                  style={{ borderColor: colors.border, margin: "22px 0 0" }}
                />
                <Text style={legal}>
                  Reach {firstName} at{" "}
                  <Link
                    href={`mailto:${submission.email}`}
                    style={{ color: colors.accent }}
                  >
                    {submission.email}
                  </Link>
                  . A copy of this estimate was also emailed to them.
                </Text>
              </>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const renderEstimateEmail = (
  submission: EstimateSubmission,
  assets: EmailAssets,
  variant: Variant
) =>
  render(
    <EstimateEmail assets={assets} submission={submission} variant={variant} />,
    {
      pretty: false,
    }
  );
