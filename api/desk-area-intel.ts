/**
 * Vercel serverless: GET /api/desk-area-intel.
 *
 * Returns aggregate public housing signals only. It does not expose homeowner
 * names, addresses, emails, or phone numbers.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getDeskAreaIntel } from "./lib/desk-area-intel.js";

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const applyCors = (res: VercelResponse, origin: string | undefined): void => {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    if (origin) {
      res.setHeader("Vary", "Origin");
    }
    return;
  }
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

const deskAreaIntelHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  const result = await getDeskAreaIntel();
  res
    .status(result.status)
    .setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400")
    .json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await deskAreaIntelHandler(req, res);
  } catch (error) {
    console.error("[api/desk-area-intel]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Desk area intelligence error.",
        ok: false,
      });
    }
  }
}
