/**
 * GET /api/email/recipients?search= → { recipients: [{ id, name, email }] }
 *
 * Lists contacts for the composer's recipient picker, merging two sources
 * (deduped by email): the website's Sanity `emailContact` list (people who used
 * the contact form) and Attio People. Either source may be unconfigured.
 * Google-auth gated.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  authorizeSeoDashboardRequest,
  DashboardAuthError,
} from "../../server/seo/googleAuth.js";
import { listAttioPeople } from "./attio.js";
import { listEmailContacts, mergeRecipients } from "./contactsStore.js";

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await authorizeSeoDashboardRequest(req.headers.authorization);

    const attioToken = process.env.ATTIO_API_TOKEN?.trim();
    const sanityToken =
      process.env.SANITY_WRITE_TOKEN?.trim() ||
      process.env.SANITY_API_WRITE_TOKEN?.trim();

    if (!(attioToken || sanityToken)) {
      res.status(503).json({
        error:
          "No recipient source configured (set SANITY_WRITE_TOKEN and/or ATTIO_API_TOKEN).",
      });
      return;
    }

    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const [attio, sanity] = await Promise.all([
      attioToken
        ? listAttioPeople(attioToken, { search }).catch((error) => {
            console.error("[api/email/recipients] Attio", error);
            return [];
          })
        : Promise.resolve([]),
      sanityToken
        ? listEmailContacts(sanityToken, { search }).catch((error) => {
            console.error("[api/email/recipients] Sanity", error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ recipients: mergeRecipients(attio, sanity) });
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[api/email/recipients]", error);
    res.status(502).json({ error: "Could not load contacts." });
  }
}
