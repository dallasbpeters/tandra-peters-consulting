/**
 * POST /api/email/send → { sent, failed }
 *
 * Body: { recipients: [{ id?, name?, email }], content: ClientEmailContent }
 *
 * Renders the client email once and sends an individual copy to each recipient
 * via Resend (no shared To/Bcc, so addresses stay private). Best-effort logs a
 * note on each matching Attio person. Google-auth gated.
 *
 * Env:
 *   RESEND_API_KEY    — Resend API key.
 *   EMAIL_FROM        — Verified sender, e.g. "Tandra Peters <tandra@tandra.me>".
 *   EMAIL_REPLY_TO    — Optional reply-to (defaults to the signature email).
 *   ATTIO_API_TOKEN   — Optional; used to log a note on the contact's timeline.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { Resend } from "resend";

import type { ClientEmailContent, EmailAssets, EmailRecipient } from "../../server/email/types.js";

import { postAttioPersonNote } from "../../server/email/attio.js";
import { renderClientEmail } from "../../server/email/template.js";
import { DashboardAuthError, authorizeSeoDashboardRequest } from "../../server/seo/googleAuth.js";

const ASSET_BASE = (process.env.EMAIL_ASSET_BASE_URL ?? "https://www.tandra.me").replace(/\/$/, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const apiAssets: EmailAssets = {
  headerLogoUrl: `${ASSET_BASE}/BC_Horizontal_Color.png`,
  signatureLogoFallback: `${ASSET_BASE}/BC_Horizontal_Color.png`,
};

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

const parseRecipients = (value: unknown): EmailRecipient[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: EmailRecipient[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const email = typeof rec.email === "string" ? rec.email.trim().toLowerCase() : "";
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({
      id: typeof rec.id === "string" ? rec.id : "",
      name: typeof rec.name === "string" && rec.name.trim() ? rec.name.trim() : email,
      email,
    });
  }
  return out;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await authorizeSeoDashboardRequest(req.headers.authorization);

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      res.status(503).json({
        error: "Email sending is not configured (missing RESEND_API_KEY or EMAIL_FROM).",
      });
      return;
    }

    const body = parseBody(req);
    const recipients = parseRecipients(body.recipients);
    if (recipients.length === 0) {
      res.status(400).json({ error: "Add at least one valid recipient." });
      return;
    }
    if (recipients.length > 200) {
      res.status(400).json({ error: "Too many recipients in one send (max 200)." });
      return;
    }

    const content = (body.content as ClientEmailContent | undefined) ?? {};
    const subject = content.subject?.trim() || "A note from Tandra Peters";
    const replyTo = process.env.EMAIL_REPLY_TO?.trim() || content.signature?.email?.trim();

    const html = await renderClientEmail(content, apiAssets);

    const resend = new Resend(apiKey);
    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];
    const attioToken = process.env.ATTIO_API_TOKEN?.trim();
    const today = new Date().toISOString().slice(0, 10);

    for (const recipient of recipients) {
      try {
        const result = await resend.emails.send({
          from,
          to: [recipient.email],
          subject,
          html,
          ...(replyTo ? { replyTo } : {}),
        });
        if (result.error) {
          failed.push({ email: recipient.email, error: result.error.message });
          continue;
        }
        sent.push(recipient.email);

        if (attioToken && recipient.id) {
          await postAttioPersonNote(
            attioToken,
            recipient.id,
            `Email sent · ${subject} · ${today}`,
            `Subject: ${subject}\nSent to: ${recipient.email}\nSource: Email composer`,
          );
        }
      } catch (err) {
        failed.push({
          email: recipient.email,
          error: err instanceof Error ? err.message : "Send failed",
        });
      }
    }

    console.info("[api/email/send]", {
      sent: sent.length,
      failed: failed.length,
    });
    res.status(failed.length && !sent.length ? 502 : 200).json({
      sent,
      failed,
    });
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[api/email/send]", error);
    res.status(500).json({ error: "Could not send email." });
  }
}
