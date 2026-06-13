import type { ClientEmailContent, EmailAssets } from "../../server/email/types";

import { fetchClientEmail } from "../../server/email/sanity";
/**
 * Design preview for the client email. The actual template + renderer live in
 * `server/email/template.tsx` (single source of truth, shared with the Vercel
 * render/send endpoints). This file just feeds it live Sanity content and
 * preview-server static assets.
 */
import { ClientEmailDocument } from "../../server/email/template";

const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";

const assets: EmailAssets = {
  headerLogoUrl: `${baseUrl}/static/BC_Horizontal_Color.png`,
  signatureLogoFallback: `${baseUrl}/static/BC_Horizontal_Color.png`,
  signatureHeadshotFallback: `${baseUrl}/static/tandra.webp`,
};

export const TandraClientEmail = async (props: ClientEmailContent) => {
  const live = await fetchClientEmail();
  const content = live ?? props ?? {};
  return <ClientEmailDocument content={content} assets={assets} />;
};

TandraClientEmail.PreviewProps = {
  subject: "Your roof inspection summary & next steps",
  previewText: "Here's what I found on your roof and what we'll do next.",
  greeting: "Hi Sarah,",
  ctaLabel: "View your inspection report",
  ctaUrl: "https://www.tandra.me",
  closing: "Talk soon,",
  signature: {
    name: "Tandra Peters",
    jobTitle: "Roofing Consultant",
    company: "Birdcreek Roofing",
    tagline: "Helping Central Texas homeowners through the roofing process.",
    phone: "(512) 968-3965",
    email: "tandra@birdcreekroofing.com",
    website: "https://www.tandra.me",
  },
} satisfies ClientEmailContent;

export default TandraClientEmail;
