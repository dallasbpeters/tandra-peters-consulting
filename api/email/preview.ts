/**
 * GET /api/email/preview
 *
 * Renders the published client email to HTML for the in-Studio iframe preview.
 * Public (no auth) — only reads the published Sanity document.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { fetchClientEmail } from "../../server/email/sanity.js";
import { renderClientEmail } from "../../server/email/template.js";
import type { EmailAssets } from "../../server/email/types.js";

const ASSET_BASE = (
  process.env.EMAIL_ASSET_BASE_URL ?? "https://www.tandra.me"
).replace(/\/$/, "");

const assets: EmailAssets = {
  headerLogoUrl: `${ASSET_BASE}/BC_Horizontal_Color.png`,
  signatureHeadshotFallback: `${ASSET_BASE}/tandra.webp`,
  signatureLogoFallback: `${ASSET_BASE}/BC_Horizontal_Color.png`,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const content = (await fetchClientEmail()) ?? {};
    const html = await renderClientEmail(content, assets);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(html);
  } catch (error) {
    console.error("[api/email/preview]", error);
    res.status(500).json({ error: "Could not render email preview" });
  }
}
