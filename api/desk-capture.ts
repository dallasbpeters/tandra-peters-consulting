/**
 * Vercel serverless: GET/POST /api/desk-capture.
 *
 * Captured records are written as Sanity drafts so homeowner details stay out
 * of public-read content. A captured email also updates `emailContact` so the
 * email composer can reach that person later.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { captureDeskLead, listDeskLeads } from "./lib/desk-capture.js";
import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

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

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

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

const authenticate = (req: VercelRequest): string | null => {
  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) {
    return null;
  }

  const user = parseGoogleIdToken(bearer);
  if (!(user && isAllowedGoogleUser(user))) {
    return null;
  }

  return user.email;
};

const deskCaptureHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  const capturedBy = authenticate(req);
  if (!capturedBy) {
    res
      .status(401)
      .json({ error: "Missing authorized Google session.", ok: false });
    return;
  }

  const sanityWriteToken = readWriteToken();
  const result =
    req.method === "GET"
      ? await listDeskLeads({ sanityWriteToken })
      : await captureDeskLead(parseBody(req), {
          capturedBy,
          sanityWriteToken,
        });

  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await deskCaptureHandler(req, res);
  } catch (error) {
    console.error("[api/desk-capture]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Desk capture error.",
        ok: false,
      });
    }
  }
}
