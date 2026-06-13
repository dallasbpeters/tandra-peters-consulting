/**
 * GET /api/email/recipients?search= → { recipients: [{ id, name, email }] }
 *
 * Lists contacts (Attio People with an email) for the composer's recipient
 * picker. Google-auth gated; reuses the website's ATTIO_API_TOKEN.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { listAttioPeople } from "../../server/email/attio.js";
import { DashboardAuthError, authorizeSeoDashboardRequest } from "../../server/seo/googleAuth.js";

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await authorizeSeoDashboardRequest(req.headers.authorization);

    const token = process.env.ATTIO_API_TOKEN?.trim();
    if (!token) {
      res.status(503).json({ error: "CRM is not configured (missing ATTIO_API_TOKEN)." });
      return;
    }

    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const recipients = await listAttioPeople(token, { search });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ recipients });
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[api/email/recipients]", error);
    res.status(502).json({ error: "Could not load contacts from the CRM." });
  }
}
