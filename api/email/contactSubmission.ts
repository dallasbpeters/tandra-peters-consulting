/**
 * Shared contact-form processing: validate a submission, email the lead to
 * Tandra (Resend), and save the submitter to the Sanity contact list. Used by
 * both the Vercel function (`api/contact.ts`) and the `pnpm dev` middleware
 * (`plugins/viteContactDevApi.ts`) so the logic stays in one place.
 *
 * Transport concerns (CORS, Origin allowlist, request parsing) stay in the
 * entry points; this module is request-agnostic.
 */
import { Resend } from "resend";

import { renderContactLeadEmail } from "./contactLead.js";
import { upsertContactLead } from "./contactsStore.js";
import type { ContactLeadSubmission, EmailAssets } from "./types.js";

const CONTACT_SERVICE_ROWS = [
  { label: "Shingle Roofing", value: "shingle-roofing" },
  { label: "Metal Roofing", value: "metal-roofing" },
  { label: "Storm Damage Restoration", value: "storm-damage-restoration" },
  { label: "Commercial Roofing", value: "commercial-roofing" },
  {
    label: "Hail & Wind Damage Roof Inspection",
    value: "hail-wind-damage-roof-inspection",
  },
] as const;

const SERVICE_VALUE_SET = new Set<string>(
  CONTACT_SERVICE_ROWS.map((o) => o.value)
);
const isValidContactServiceValue = (v: string): boolean =>
  SERVICE_VALUE_SET.has(v);
const contactServiceLabel = (value: string): string | null =>
  CONTACT_SERVICE_ROWS.find((o) => o.value === value)?.label ?? null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAILING_SLASH_RE = /\/$/;
const DEFAULT_NOTIFICATION_TO = "tandra@birdcreekroofing.com";

/** Runtime configuration sourced from env by each entry point. */
export interface ContactEnv {
  /** Base URL for the email logo (defaults to https://www.tandra.me). */
  assetBaseUrl?: string;
  emailFrom?: string;
  /** Raw comma-separated CONTACT_NOTIFICATION_TO value. */
  notificationTo?: string;
  resendApiKey?: string;
  /** Sanity write token; when set, the submitter is saved to the contact list. */
  sanityWriteToken?: string;
}

export interface ContactResult {
  body: { ok: boolean; error?: string };
  status: number;
}

const parseNotificationRecipients = (raw?: string): string[] => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return [DEFAULT_NOTIFICATION_TO];
  }
  const list = trimmed
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => EMAIL_RE.test(s));
  return list.length > 0 ? list : [DEFAULT_NOTIFICATION_TO];
};

const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * Validate, email, and persist a contact-form submission. Returns the HTTP
 * status + JSON body the caller should send back.
 */
export const processContactSubmission = async (
  body: Record<string, unknown>,
  env: ContactEnv
): // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
Promise<ContactResult> => {
  // Honeypot: silently accept bot submissions.
  const honeypot = str(body._hp) || str(body.company);
  if (honeypot) {
    return { body: { ok: true }, status: 200 };
  }

  const apiKey = env.resendApiKey?.trim();
  const from = env.emailFrom?.trim();
  if (!(apiKey && from)) {
    return {
      body: { error: "Service not configured", ok: false },
      status: 503,
    };
  }

  const fullName = str(body.fullName);
  const email = str(body.email);
  const propertyAddress = str(body.propertyAddress);
  const phoneNumber = str(body.phoneNumber);
  const message = str(body.message);
  const serviceInterestRaw = str(body.serviceInterest);
  const consentToContact = body.consentToContact === true;

  if (!consentToContact) {
    return {
      body: {
        error: "Please confirm you agree to be contacted before submitting.",
        ok: false,
      },
      status: 400,
    };
  }
  if (!fullName || fullName.length > 200) {
    return {
      body: { error: "Please enter your name.", ok: false },
      status: 400,
    };
  }
  if (!(email && EMAIL_RE.test(email)) || email.length > 320) {
    return {
      body: { error: "Please enter a valid email.", ok: false },
      status: 400,
    };
  }
  if (!isValidContactServiceValue(serviceInterestRaw)) {
    return {
      body: { error: "Please select a service.", ok: false },
      status: 400,
    };
  }
  const serviceLine = contactServiceLabel(serviceInterestRaw);
  if (!message || message.length > 8000) {
    return {
      body: { error: "Please enter a message.", ok: false },
      status: 400,
    };
  }
  if (propertyAddress.length > 500) {
    return {
      body: { error: "Property address is too long.", ok: false },
      status: 400,
    };
  }
  if (phoneNumber.length > 80) {
    return {
      body: { error: "Phone number is too long.", ok: false },
      status: 400,
    };
  }

  const submission: ContactLeadSubmission = {
    email: email.toLowerCase(),
    fullName,
    message,
    phoneNumber: phoneNumber || undefined,
    propertyAddress: propertyAddress || undefined,
    serviceLabel: serviceLine ?? serviceInterestRaw,
    submittedAt: new Date().toISOString(),
  };

  const base = (env.assetBaseUrl?.trim() || "https://www.tandra.me").replace(
    TRAILING_SLASH_RE,
    ""
  );
  const assets: EmailAssets = {
    headerLogoUrl: `${base}/BC_Horizontal_Color.png`,
    signatureLogoFallback: `${base}/BC_Horizontal_Color.png`,
  };

  const subject = `New roofing inquiry · ${fullName} · ${serviceLine ?? serviceInterestRaw}`;
  const html = await renderContactLeadEmail(submission, assets);

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    html,
    replyTo: submission.email,
    subject,
    to: parseNotificationRecipients(env.notificationTo),
  });

  if (result.error) {
    console.error("[contact] Resend error", result.error);
    return {
      body: {
        error:
          "Could not send your message. Try again later or contact us by phone or email.",
        ok: false,
      },
      status: 502,
    };
  }

  console.info("[contact] lead emailed", {
    id: result.data?.id,
    service: serviceInterestRaw,
  });

  // Save the submitter to the Sanity contact list (draft-only). Non-fatal: never
  // block the visitor's success response on a CRM write.
  const sanityToken = env.sanityWriteToken?.trim();
  if (sanityToken) {
    try {
      await upsertContactLead(sanityToken, submission);
    } catch (error) {
      console.error("[contact] contact upsert failed", error);
    }
  } else {
    console.warn(
      "[contact] SANITY_WRITE_TOKEN not set — contact not saved to Sanity"
    );
  }

  return { body: { ok: true }, status: 200 };
};
