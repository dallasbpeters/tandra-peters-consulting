/**
 * POST /api/email/render → { html }
 *
 * Renders the client email to HTML for the in-app composer preview. Accepts an
 * optional `content` body (the live form edits); falls back to the published
 * Sanity document. Google-auth gated (same allowlist as the SEO dashboard).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  authorizeSeoDashboardRequest,
  DashboardAuthError,
} from "../../server/seo/googleAuth.js";
import { fetchClientEmail } from "./sanity.js";
import { renderClientEmail } from "./template.js";
import type { ClientEmailContent, EmailAssets } from "./types.js";

const ASSET_BASE = (
  process.env.EMAIL_ASSET_BASE_URL ?? "https://www.tandra.me"
).replace(/\/$/, "");

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

    const body = parseBody(req);
    const provided = body.content as ClientEmailContent | undefined;
    const content = provided ?? (await fetchClientEmail()) ?? {};

    const html = await renderClientEmail(content, apiAssets);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ html });
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[api/email/render]", error);
    res.status(500).json({ error: "Could not render email" });
  }
}
