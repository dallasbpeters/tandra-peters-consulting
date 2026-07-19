/**
 * POST /api/reports-send → { sent, failed }
 *
 * Emails a saved report to one or more recipients via Resend, rendering the
 * React Email report template. Attaches the PDF when it is small enough
 * (Resend caps total message size around 40 MB); always includes the hosted
 * link as a fallback. Google-auth gated; best-effort Attio timeline note.
 *
 * Body: { recipients:[{id?,name?,email}], reportTitle, message?, pdfUrl,
 *         driveWebViewLink?, subject? }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

import {
  authorizeSeoDashboardRequest,
  DashboardAuthError,
} from "../server/seo/googleAuth.js";
import { postAttioPersonNote } from "./email/attio.js";
import { renderReportEmail } from "./email/reportEmail.js";
import type { EmailRecipient } from "./email/types.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACH_BYTES = 18_000_000;

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
};

const parseRecipients = (value: unknown): EmailRecipient[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const out: EmailRecipient[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const email =
      typeof rec.email === "string" ? rec.email.trim().toLowerCase() : "";
    if (!(email && EMAIL_RE.test(email)) || seen.has(email)) {
      continue;
    }
    seen.add(email);
    out.push({
      email,
      id: typeof rec.id === "string" ? rec.id : "",
      name:
        typeof rec.name === "string" && rec.name.trim()
          ? rec.name.trim()
          : email,
    });
  }
  return out;
};

const fetchPdfAttachment = async (
  pdfUrl: string,
  filename: string
): Promise<{ content: Buffer; filename: string } | null> => {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_ATTACH_BYTES) {
      return null;
    }
    return { content: buffer, filename };
  } catch {
    return null;
  }
};

const sanitizeFilename = (title: string): string => {
  const base = title
    .trim()
    .replaceAll(/[^\w\s-]/g, "")
    .replaceAll(/\s+/g, "-");
  return `${base || "roof-report"}.pdf`;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
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
    if (!(apiKey && from)) {
      res.status(503).json({
        error:
          "Email sending is not configured (missing RESEND_API_KEY or EMAIL_FROM).",
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
      res
        .status(400)
        .json({ error: "Too many recipients in one send (max 200)." });
      return;
    }

    const reportTitle =
      typeof body.reportTitle === "string" && body.reportTitle.trim()
        ? body.reportTitle.trim()
        : "Roof inspection report";
    const pdfUrl = typeof body.pdfUrl === "string" ? body.pdfUrl.trim() : "";
    if (!pdfUrl) {
      res.status(400).json({ error: "Missing report PDF URL." });
      return;
    }
    const message = typeof body.message === "string" ? body.message : "";
    const driveWebViewLink =
      typeof body.driveWebViewLink === "string"
        ? body.driveWebViewLink
        : undefined;
    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : reportTitle;
    const replyTo = process.env.EMAIL_REPLY_TO?.trim();

    const attachment = await fetchPdfAttachment(
      pdfUrl,
      sanitizeFilename(reportTitle)
    );

    const resend = new Resend(apiKey);
    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];
    const attioToken = process.env.ATTIO_API_TOKEN?.trim();
    const today = new Date().toISOString().slice(0, 10);

    for (const recipient of recipients) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential keeps sends private + rate-safe
        const html = await renderReportEmail({
          driveWebViewLink,
          message,
          pdfUrl,
          recipientName:
            recipient.name === recipient.email ? "" : recipient.name,
          reportTitle,
          senderName: "Tandra Peters",
        });
        // eslint-disable-next-line no-await-in-loop -- one private send per recipient
        const result = await resend.emails.send({
          from,
          html,
          subject,
          to: [recipient.email],
          ...(replyTo ? { replyTo } : {}),
          ...(attachment ? { attachments: [attachment] } : {}),
        });
        if (result.error) {
          failed.push({ email: recipient.email, error: result.error.message });
          continue;
        }
        sent.push(recipient.email);

        if (attioToken && recipient.id) {
          // eslint-disable-next-line no-await-in-loop -- best-effort per recipient
          await postAttioPersonNote(
            attioToken,
            recipient.id,
            `Report sent · ${reportTitle} · ${today}`,
            `Report: ${reportTitle}\nSent to: ${recipient.email}\nPDF: ${pdfUrl}`
          );
        }
      } catch (error) {
        failed.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : "Send failed",
        });
      }
    }

    res.status(failed.length && !sent.length ? 502 : 200).json({
      attached: Boolean(attachment),
      failed,
      sent,
    });
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[api/reports-send]", error);
    res.status(500).json({ error: "Could not send the report." });
  }
}
