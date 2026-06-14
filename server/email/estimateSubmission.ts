/**
 * Shared estimator processing: validate a completed estimate, email a copy to
 * the visitor AND a lead notification to Tandra (Resend), and save the visitor
 * to the Sanity contact list. Used by both the Vercel function
 * (`api/estimate.ts`) and the `pnpm dev` middleware (`plugins/viteEstimateDevApi.ts`).
 *
 * Transport concerns (CORS, Origin allowlist, request parsing) stay in the entry
 * points; this module is request-agnostic.
 */
import { Resend } from "resend";

import type { ContactLeadSubmission, EmailAssets, EstimateSubmission } from "./types.js";

import { upsertContactLead } from "./contactsStore.js";
import { renderEstimateEmail } from "./estimateEmail.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_NOTIFICATION_TO = "tandra@birdcreekroofing.com";

export type EstimateEnv = {
  resendApiKey?: string;
  emailFrom?: string;
  /** Raw comma-separated CONTACT_NOTIFICATION_TO value. */
  notificationTo?: string;
  /** Base URL for the email logo (defaults to https://www.tandra.me). */
  assetBaseUrl?: string;
  /** Sanity write token; when set, the visitor is saved to the contact list. */
  sanityWriteToken?: string;
};

export type EstimateResult = { status: number; body: { ok: boolean; error?: string } };

const parseNotificationRecipients = (raw?: string): string[] => {
  const trimmed = raw?.trim();
  if (!trimmed) return [DEFAULT_NOTIFICATION_TO];
  const list = trimmed
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => EMAIL_RE.test(s));
  return list.length > 0 ? list : [DEFAULT_NOTIFICATION_TO];
};

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const num = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const parseAnswers = (value: unknown): { prompt: string; answer: string }[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const r = row as Record<string, unknown>;
      return { prompt: str(r.prompt), answer: str(r.answer) };
    })
    .filter((r) => r.prompt && r.answer)
    .slice(0, 30);
};

/**
 * Validate, email (visitor + Tandra), and persist an estimate submission.
 * Returns the HTTP status + JSON body the caller should send back.
 */
export const processEstimateSubmission = async (
  body: Record<string, unknown>,
  env: EstimateEnv,
): Promise<EstimateResult> => {
  // Honeypot: silently accept bot submissions.
  const honeypot = str(body._hp) || str(body.company);
  if (honeypot) return { status: 200, body: { ok: true } };

  const apiKey = env.resendApiKey?.trim();
  const from = env.emailFrom?.trim();
  if (!apiKey || !from) {
    return { status: 503, body: { ok: false, error: "Service not configured" } };
  }

  const fullName = str(body.fullName);
  const email = str(body.email).toLowerCase();
  const rangeDisplay = str(body.rangeDisplay);
  const answers = parseAnswers(body.answers);

  if (!fullName || fullName.length > 200) {
    return { status: 400, body: { ok: false, error: "Please enter your name." } };
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return { status: 400, body: { ok: false, error: "Please enter a valid email." } };
  }
  if (!rangeDisplay) {
    return {
      status: 400,
      body: { ok: false, error: "Missing estimate. Please finish the estimator." },
    };
  }

  const submission: EstimateSubmission = {
    fullName,
    email,
    rangeDisplay,
    lowEstimate: num(body.lowEstimate),
    highEstimate: num(body.highEstimate),
    ...(num(body.squareFootage) ? { squareFootage: num(body.squareFootage) } : {}),
    answers,
    submittedAt: new Date().toISOString(),
  };

  const base = (env.assetBaseUrl?.trim() || "https://www.tandra.me").replace(/\/$/, "");
  const assets: EmailAssets = {
    headerLogoUrl: `${base}/BC_Horizontal_Color.png`,
    signatureLogoFallback: `${base}/BC_Horizontal_Color.png`,
  };

  const resend = new Resend(apiKey);

  const [visitorHtml, leadHtml] = await Promise.all([
    renderEstimateEmail(submission, assets, "visitor"),
    renderEstimateEmail(submission, assets, "lead"),
  ]);

  // 1) Send the estimate to the visitor.
  const visitorResult = await resend.emails.send({
    from,
    to: [email],
    subject: `Your roof estimate · ${rangeDisplay}`,
    html: visitorHtml,
  });

  if (visitorResult.error) {
    console.error("[estimate] Resend visitor error", visitorResult.error);
    return {
      status: 502,
      body: { ok: false, error: "Could not send your estimate. Try again later." },
    };
  }

  // 2) Notify Tandra (non-fatal: the visitor already got their estimate).
  try {
    const leadResult = await resend.emails.send({
      from,
      to: parseNotificationRecipients(env.notificationTo),
      replyTo: email,
      subject: `New estimate lead · ${fullName} · ${rangeDisplay}`,
      html: leadHtml,
    });
    if (leadResult.error) console.error("[estimate] Resend lead error", leadResult.error);
  } catch (err) {
    console.error("[estimate] lead notification failed", err);
  }

  console.info("[estimate] estimate emailed", { id: visitorResult.data?.id, range: rangeDisplay });

  // 3) Save the visitor to the Sanity contact list (non-fatal).
  const sanityToken = env.sanityWriteToken?.trim();
  if (sanityToken) {
    try {
      const lead: ContactLeadSubmission = {
        fullName,
        email,
        serviceLabel: "Roof estimate",
        message: `Estimate: ${rangeDisplay}\n${answers.map((a) => `${a.prompt}: ${a.answer}`).join("\n")}`,
        submittedAt: submission.submittedAt,
      };
      await upsertContactLead(sanityToken, lead);
    } catch (err) {
      console.error("[estimate] contact upsert failed", err);
    }
  } else {
    console.warn("[estimate] SANITY_WRITE_TOKEN not set — lead not saved to Sanity");
  }

  return { status: 200, body: { ok: true } };
};
