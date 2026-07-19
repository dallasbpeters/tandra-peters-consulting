import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";

export interface ReportEmailContent {
  driveWebViewLink?: string;
  message?: string;
  pdfUrl?: string;
  recipientName?: string;
  reportTitle: string;
  senderName?: string;
}

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
  maxWidth: "560px",
  padding: "32px",
};

const heading = { color: colors.ink, fontSize: "22px", margin: "0 0 12px" };
const paragraph = {
  color: colors.body,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};
const button = {
  backgroundColor: colors.accent,
  borderRadius: "8px",
  color: "#fff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 22px",
  textDecoration: "none",
};
const muted = { color: colors.muted, fontSize: "13px", margin: "16px 0 0" };

export const ReportEmailDocument = ({
  driveWebViewLink,
  message,
  pdfUrl,
  recipientName,
  reportTitle,
  senderName,
}: ReportEmailContent) => (
  <Html>
    <Head />
    <Preview>{`${reportTitle} — from ${senderName ?? "Tandra Peters"}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>{reportTitle}</Heading>
        <Text style={paragraph}>
          {recipientName ? `Hi ${recipientName},` : "Hi,"}
        </Text>
        <Text style={paragraph}>
          {message?.trim() ||
            "Please find your roof inspection report attached. You can also open it online using the button below."}
        </Text>
        {pdfUrl ? (
          <Section style={{ margin: "8px 0 16px" }}>
            <Button href={pdfUrl} style={button}>
              View the report
            </Button>
          </Section>
        ) : null}
        {driveWebViewLink ? (
          <Text style={muted}>
            Also available in Google Drive: {driveWebViewLink}
          </Text>
        ) : null}
        <Hr style={{ borderColor: colors.border, margin: "24px 0 16px" }} />
        <Text style={muted}>
          {senderName ?? "Tandra Peters"} · Birdcreek Roofing
        </Text>
      </Container>
    </Body>
  </Html>
);

export const renderReportEmail = (
  content: ReportEmailContent
): Promise<string> => render(<ReportEmailDocument {...content} />);
