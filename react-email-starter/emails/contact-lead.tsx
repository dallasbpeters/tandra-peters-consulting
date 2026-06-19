/**
 * Design preview for the contact-form lead notification. The actual template +
 * renderer live in `server/email/contactLead.tsx` (single source of truth,
 * shared with the `/api/contact` send). This file just feeds it preview props
 * and preview-server static assets.
 */
import { ContactLeadEmail } from "../../server/email/contactLead";
import type {
  ContactLeadSubmission,
  EmailAssets,
} from "../../server/email/types";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

const assets: EmailAssets = {
  headerLogoUrl: `${baseUrl}/static/BC_Horizontal_Color.png`,
  signatureLogoFallback: `${baseUrl}/static/BC_Horizontal_Color.png`,
};

export const ContactLead = (submission: ContactLeadSubmission) => (
  <ContactLeadEmail assets={assets} submission={submission} />
);

ContactLead.PreviewProps = {
  fullName: "Sarah Mitchell",
  email: "sarah.mitchell@example.com",
  phoneNumber: "(512) 555-0142",
  serviceLabel: "Hail & Wind Damage Roof Inspection",
  propertyAddress: "1234 Cedar Ridge Dr, Round Rock, TX 78664",
  message:
    "We had a big hailstorm last week and I'm seeing some granules in the gutters.\n\nCould you come take a look and let me know if we should file a claim? Mornings are best for us.",
  submittedAt: new Date().toISOString(),
} satisfies ContactLeadSubmission;

export default ContactLead;
