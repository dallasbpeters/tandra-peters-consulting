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

import { processContactSubmission } from "./email/contactSubmission.js";

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (raw === null) {
    return {};
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
};

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

/** True when the request may call this API: Origin in list, or Host matches an allowed origin (curl has no Origin). */
const isAllowedRequest = (req: VercelRequest): boolean => {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    return true;
  }

  const origin = req.headers.origin as string | undefined;
  if (origin && allowed.includes(origin)) {
    return true;
  }

  if (!origin) {
    const host = (req.headers.host ?? "").split(":")[0].toLowerCase();
    if (!host) {
      return false;
    }
    for (const o of allowed) {
      try {
        if (new URL(o).hostname.toLowerCase() === host) {
          return true;
        }
      } catch {
        // noop
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
    if (origin) {
      res.setHeader("Vary", "Origin");
    }
    return;
  }
  if (origin && parseAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

const contactHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
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

  const result = await processContactSubmission(parseBody(req), {
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    notificationTo: process.env.CONTACT_NOTIFICATION_TO,
    assetBaseUrl: process.env.EMAIL_ASSET_BASE_URL,
    sanityWriteToken:
      process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN,
  });

  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
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
