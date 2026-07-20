/**
 * Dev-only middleware that mirrors POST /api/reports-send so the "Send
 * report" dialog works under `pnpm dev` without `vercel dev`. Mirrors
 * api/reports-send.ts. Requires RESEND_API_KEY + EMAIL_FROM in .env.local.
 */
import type { ServerResponse } from "node:http";

import { Resend } from "resend";
import type { Plugin } from "vite";

import { renderReportEmail } from "../api/email/reportEmail";
import { postAttioPersonNote } from "../server/email/attio";
import {
  DashboardAuthError,
  authorizeSeoDashboardRequest,
} from "../server/seo/googleAuth";
import { readRequestBody } from "./request-body";

const PATH = "/api/reports-send";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACH_BYTES = 18_000_000;

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const pick = (env: Record<string, string>, key: string): string =>
  env[key]?.trim() || process.env[key]?.trim() || "";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

interface EmailRecipient {
  email: string;
  id: string;
  name: string;
}

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

const UNSAFE_FILENAME_RE = /[^\w\s-]/g;
const WHITESPACE_RE = /\s+/g;

const sanitizeFilename = (title: string): string => {
  const base = title
    .trim()
    .replaceAll(UNSAFE_FILENAME_RE, "")
    .replaceAll(WHITESPACE_RE, "-");
  return `${base || "roof-report"}.pdf`;
};

export const viteReportsSendApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== PATH) {
        next();
        return;
      }

      setCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") {
        json(res, 405, { error: "Method not allowed" });
        return;
      }

      try {
        await authorizeSeoDashboardRequest(
          typeof req.headers.authorization === "string"
            ? req.headers.authorization
            : undefined,
          env
        );

        const apiKey = pick(env, "RESEND_API_KEY");
        const from = pick(env, "EMAIL_FROM");
        if (!(apiKey && from)) {
          json(res, 503, {
            error:
              "Email sending is not configured (missing RESEND_API_KEY or EMAIL_FROM).",
          });
          return;
        }

        const raw = await readRequestBody(req);
        const body = raw.length
          ? (JSON.parse(raw.toString("utf-8")) as Record<string, unknown>)
          : {};

        const recipients = parseRecipients(body.recipients);
        if (recipients.length === 0) {
          json(res, 400, { error: "Add at least one valid recipient." });
          return;
        }
        if (recipients.length > 200) {
          json(res, 400, {
            error: "Too many recipients in one send (max 200).",
          });
          return;
        }

        const reportTitle =
          typeof body.reportTitle === "string" && body.reportTitle.trim()
            ? body.reportTitle.trim()
            : "Roof inspection report";
        const pdfUrl =
          typeof body.pdfUrl === "string" ? body.pdfUrl.trim() : "";
        if (!pdfUrl) {
          json(res, 400, { error: "Missing report PDF URL." });
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
        const replyTo = pick(env, "EMAIL_REPLY_TO");

        const attachment = await fetchPdfAttachment(
          pdfUrl,
          sanitizeFilename(reportTitle)
        );

        const resend = new Resend(apiKey);
        const sent: string[] = [];
        const failed: { email: string; error: string }[] = [];
        const attioToken = pick(env, "ATTIO_API_TOKEN");
        const today = new Date().toISOString().slice(0, 10);

        for (const recipient of recipients) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const html = await renderReportEmail({
              driveWebViewLink,
              message,
              pdfUrl,
              recipientName:
                recipient.name === recipient.email ? "" : recipient.name,
              reportTitle,
              senderName: "Tandra Peters",
            });
            // eslint-disable-next-line no-await-in-loop
            const result = await resend.emails.send({
              from,
              html,
              subject,
              to: [recipient.email],
              ...(replyTo ? { replyTo } : {}),
              ...(attachment ? { attachments: [attachment] } : {}),
            });
            if (result.error) {
              failed.push({
                email: recipient.email,
                error: result.error.message,
              });
              continue;
            }
            sent.push(recipient.email);

            if (attioToken && recipient.id) {
              // eslint-disable-next-line no-await-in-loop
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

        json(res, failed.length && !sent.length ? 502 : 200, {
          attached: Boolean(attachment),
          failed,
          sent,
        });
      } catch (error) {
        if (error instanceof DashboardAuthError) {
          json(res, error.status, { error: error.message });
          return;
        }
        console.error("[vite-reports-send-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Could not send the report.",
        });
      }
    });
  },
  name: "vite-reports-send-api",
});
