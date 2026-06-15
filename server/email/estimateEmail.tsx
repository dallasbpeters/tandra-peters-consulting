import type { CSSProperties } from "react";

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
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";

import type { EmailAssets, EstimateSubmission } from "./types.js";

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

const rangeBox: CSSProperties = {
  backgroundColor: "#eef4f0",
  borderRadius: "10px",
  padding: "22px 24px",
  margin: "0 0 22px",
  textAlign: "center",
};

const labelCell: CSSProperties = {
  fontSize: "13px",
  color: colors.muted,
  padding: "8px 0",
  borderBottom: `1px solid ${colors.border}`,
};

const valueCell: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: colors.body,
  textAlign: "right",
  padding: "8px 0",
  borderBottom: `1px solid ${colors.border}`,
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
  fontSize: "11px",
  lineHeight: "18px",
  color: "#8a958e",
  margin: "20px 0 0",
};

const AnswerRows = ({ answers }: { answers: EstimateSubmission["answers"] }) => (
  <Section style={{ margin: "0 0 8px" }}>
    {answers.map((row, i) => (
      <Row key={i}>
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
  const firstName = submission.fullName.trim().split(/\s+/)[0] || "there";
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
              src={assets.headerLogoUrl}
              height="60"
              alt="Birdcreek Roofing"
              style={{ display: "block" }}
            />
          </Section>

          <Section style={inner}>
            <Heading
              as="h1"
              style={{
                fontSize: "21px",
                color: colors.ink,
                margin: "0 0 6px",
                lineHeight: "28px",
              }}
            >
              {isVisitor ? `Here's your rough estimate, ${firstName}` : "New estimate lead"}
            </Heading>
            <Text
              style={{
                fontSize: "13px",
                color: colors.muted,
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
                  fontSize: "12px",
                  color: colors.muted,
                  margin: "0 0 4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Estimated range
              </Text>
              <Text
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: colors.ink,
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
                    fontSize: "14px",
                    lineHeight: "22px",
                    color: colors.body,
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
                <Hr style={{ borderColor: colors.border, margin: "22px 0 0" }} />
                <Text style={legal}>— Tandra Peters, Roofing Consultant · Birdcreek Roofing</Text>
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
                <Hr style={{ borderColor: colors.border, margin: "22px 0 0" }} />
                <Text style={legal}>
                  Reach {firstName} at{" "}
                  <Link href={`mailto:${submission.email}`} style={{ color: colors.accent }}>
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
  variant: Variant,
) =>
  render(<EstimateEmail submission={submission} assets={assets} variant={variant} />, {
    pretty: false,
  });
