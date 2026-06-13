/**
 * Vercel serverless: POST /api/contact → emails the submission to Tandra (Resend).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY          — Resend API key.
 *   EMAIL_FROM              — Verified sender, e.g. "Tandra Peters <tandra@tandra.me>".
 *   CONTACT_NOTIFICATION_TO — Optional. Comma-separated recipients for lead emails.
 *                             Defaults to tandra@birdcreekroofing.com.
 *   EMAIL_ASSET_BASE_URL    — Optional. Base URL for email logo (defaults to https://www.tandra.me).
 *   SANITY_WRITE_TOKEN      — Optional. When set, each submitter is saved to the
 *     (or SANITY_API_WRITE_TOKEN)  Sanity `emailContact` list (draft-only, deduped by email) so
 *                             the email composer can reach them later. Non-fatal if missing.
 *   ALLOWED_ORIGINS         — Optional. Comma-separated exact Origin values, e.g.
 *                             https://tandra.me,https://www.tandra.me
 *                             If omitted, any origin is allowed (OK for early setup; tighten for production).
 *                             Requests with no Origin (e.g. curl) are allowed when Host matches one of these URLs' hostnames.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { Resend } from "resend";

import type { ContactLeadSubmission, EmailAssets } from "../server/email/types.js";

import { renderContactLeadEmail } from "../server/email/contactLead.js";
import { upsertContactLead } from "../server/email/contactsStore.js";

/**
 * Inline copy of labels/validation (see `contactServiceOptions.ts` in the app).
 * Kept inside `api/` so the Vercel function bundle does not depend on imports
 * outside this folder (avoids FUNCTION_INVOCATION_FAILED from missing modules).
 */
const CONTACT_SERVICE_ROWS = [
  { value: "shingle-roofing", label: "Shingle Roofing" },
  { value: "metal-roofing", label: "Metal Roofing" },
  { value: "storm-damage-restoration", label: "Storm Damage Restoration" },
  { value: "commercial-roofing", label: "Commercial Roofing" },
  {
    value: "hail-wind-damage-roof-inspection",
    label: "Hail & Wind Damage Roof Inspection",
  },
] as const;

const SERVICE_VALUE_SET = new Set<string>(CONTACT_SERVICE_ROWS.map((o) => o.value));

const isValidContactServiceValue = (v: string): boolean => SERVICE_VALUE_SET.has(v);

const contactServiceLabel = (value: string): string | null => {
  const row = CONTACT_SERVICE_ROWS.find((o) => o.value === value);
  return row?.label ?? null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ASSET_BASE = (process.env.EMAIL_ASSET_BASE_URL ?? "https://www.tandra.me").replace(/\/$/, "");

const leadAssets: EmailAssets = {
  headerLogoUrl: `${ASSET_BASE}/BC_Horizontal_Color.png`,
  signatureLogoFallback: `${ASSET_BASE}/BC_Horizontal_Color.png`,
};

const DEFAULT_NOTIFICATION_TO = "tandra@birdcreekroofing.com";

const parseNotificationRecipients = (): string[] => {
  const raw = process.env.CONTACT_NOTIFICATION_TO?.trim();
  if (!raw) return [DEFAULT_NOTIFICATION_TO];
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => EMAIL_RE.test(s));
  return list.length > 0 ? list : [DEFAULT_NOTIFICATION_TO];
};

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
};

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

/** True when the request may call this API: Origin in list, or Host matches an allowed origin (curl has no Origin). */
const isAllowedRequest = (req: VercelRequest): boolean => {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) return true;

  const origin = req.headers.origin as string | undefined;
  if (origin && allowed.includes(origin)) return true;

  if (!origin) {
    const host = (req.headers.host ?? "").split(":")[0].toLowerCase();
    if (!host) return false;
    for (const o of allowed) {
      try {
        if (new URL(o).hostname.toLowerCase() === host) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
};

/** Browsers send Origin on POST + JSON; preflight OPTIONS must echo ACAO or the request fails. */
const applyCors = (res: VercelResponse, origin: string | undefined): void => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    if (origin) res.setHeader("Vary", "Origin");
    return;
  }
  if (origin && parseAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

const contactHandler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAllowedRequest(req)) {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    res.status(503).json({ ok: false, error: "Service not configured" });
    return;
  }

  const body = parseBody(req);

  const honeypot =
    typeof body._hp === "string"
      ? body._hp.trim()
      : typeof body.company === "string"
        ? body.company.trim()
        : "";
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const propertyAddress =
    typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const serviceInterestRaw =
    typeof body.serviceInterest === "string" ? body.serviceInterest.trim() : "";
  const consentToContact = body.consentToContact === true;

  if (!consentToContact) {
    res.status(400).json({
      ok: false,
      error: "Please confirm you agree to be contacted before submitting.",
    });
    return;
  }

  if (!fullName || fullName.length > 200) {
    res.status(400).json({ ok: false, error: "Please enter your name." });
    return;
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    res.status(400).json({ ok: false, error: "Please enter a valid email." });
    return;
  }
  if (!isValidContactServiceValue(serviceInterestRaw)) {
    res.status(400).json({ ok: false, error: "Please select a service." });
    return;
  }
  const serviceLine = contactServiceLabel(serviceInterestRaw);
  if (!message || message.length > 8000) {
    res.status(400).json({ ok: false, error: "Please enter a message." });
    return;
  }
  if (propertyAddress.length > 500) {
    res.status(400).json({ ok: false, error: "Property address is too long." });
    return;
  }
  if (phoneNumber.length > 80) {
    res.status(400).json({ ok: false, error: "Phone number is too long." });
    return;
  }

  const submission: ContactLeadSubmission = {
    fullName,
    email: email.toLowerCase(),
    phoneNumber: phoneNumber || undefined,
    serviceLabel: serviceLine ?? serviceInterestRaw,
    message,
    propertyAddress: propertyAddress || undefined,
    submittedAt: new Date().toISOString(),
  };

  const subject = `New roofing inquiry · ${fullName} · ${serviceLine ?? serviceInterestRaw}`;
  const html = await renderContactLeadEmail(submission, leadAssets);

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: parseNotificationRecipients(),
    replyTo: submission.email,
    subject,
    html,
  });

  if (result.error) {
    console.error("[api/contact] Resend error", result.error);
    res.status(502).json({
      ok: false,
      error: "Could not send your message. Try again later or contact us by phone or email.",
    });
    return;
  }

  console.info("[api/contact] lead emailed", { id: result.data?.id, service: serviceInterestRaw });

  // Save the submitter to the Sanity contact list (draft-only) so the email
  // composer can reach them later. Non-fatal: never block the visitor's success.
  const sanityToken =
    process.env.SANITY_WRITE_TOKEN?.trim() || process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (sanityToken) {
    try {
      await upsertContactLead(sanityToken, submission);
    } catch (err) {
      console.error("[api/contact] contact upsert failed", err);
    }
  }

  res.status(200).json({ ok: true });
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await contactHandler(req, res);
  } catch (err) {
    console.error("[api/contact]", err);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        ok: false,
        error: "Internal server error. Please try again or call.",
      });
    }
  }
}
