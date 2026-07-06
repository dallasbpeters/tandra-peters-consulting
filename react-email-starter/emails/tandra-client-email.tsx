import { fetchClientEmail } from "../../server/email/sanity";
/**
 * Design preview for the client email. The actual template + renderer live in
 * `server/email/template.tsx` (single source of truth, shared with the Vercel
 * render/send endpoints). This file just feeds it live Sanity content and
 * preview-server static assets.
 */
import { ClientEmailDocument } from "../../server/email/template";
import type { ClientEmailContent, EmailAssets } from "../../server/email/types";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

const assets: EmailAssets = {
  headerLogoUrl: `${baseUrl}/static/BC_Horizontal_Color.png`,
  signatureHeadshotFallback: `${baseUrl}/static/tandra.webp`,
  signatureLogoFallback: `${baseUrl}/static/BC_Horizontal_Color.png`,
};

export const TandraClientEmail = async (props: ClientEmailContent) => {
  const live = await fetchClientEmail();
  const content = live ?? props ?? {};
  return <ClientEmailDocument assets={assets} content={content} />;
};

TandraClientEmail.PreviewProps = {
  closing: "Talk soon,",
  ctaLabel: "View your inspection report",
  ctaUrl: "https://www.tandra.me",
  greeting: "Hi Sarah,",
  previewText: "Here's what I found on your roof and what we'll do next.",
  signature: {
    company: "Birdcreek Roofing",
    email: "tandra@birdcreekroofing.com",
    jobTitle: "Roofing Consultant",
    name: "Tandra Peters",
    phone: "(512) 968-3965",
    tagline: "Helping Central Texas homeowners through the roofing process.",
    website: "https://www.tandra.me",
  },
  subject: "Your roof inspection summary & next steps",
} satisfies ClientEmailContent;

export default TandraClientEmail;
