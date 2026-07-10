/**
 * Vercel serverless: GET /api/desk-streetview?mode=meta&lat=&lng=&address=
 *
 * Availability gate for the Desk Walk interactive Street View. Uses the
 * server-side `GOOGLE_STREETVIEW_API_KEY` to hit Google's Street View metadata
 * endpoint and returns ONLY `{ ok, available, reason? }` — the key never reaches
 * the browser. The client mounts the interactive (Embed API) panorama only when
 * `available` is true, so an empty/broken panorama is never shown.
 *
 * Google-auth gated (called via fetch with a Bearer token), like the other Desk
 * endpoints.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  readStreetViewKey,
  streetViewMetadata,
  streetViewParamsFrom,
} from "./lib/desk-streetview.js";
import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

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

const isAuthorized = (req: VercelRequest): boolean => {
  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) {
    return false;
  }
  const user = parseGoogleIdToken(bearer);
  return Boolean(user && isAllowedGoogleUser(user));
};

const deskStreetViewHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  if (!isAuthorized(req)) {
    res
      .status(401)
      .json({ error: "Missing authorized Google session.", ok: false });
    return;
  }

  const meta = await streetViewMetadata(streetViewParamsFrom(req.query), {
    apiKey: readStreetViewKey(),
  });
  res.status(200).json({ ...meta, ok: true });
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await deskStreetViewHandler(req, res);
  } catch (error) {
    console.error("[api/desk-streetview]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Street View error.",
        ok: false,
      });
    }
  }
}
