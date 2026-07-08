/**
 * Vercel serverless: GET/POST/PATCH/DELETE /api/content-calendar.
 *
 * Content-calendar entries are written as Sanity drafts so internal marketing
 * plans stay out of public-read content. All methods require an authorized
 * Google session, matching the Desk capture endpoints.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  createCalendarEntry,
  deleteCalendarEntry,
  listCalendarEntries,
  updateCalendarEntry,
} from "./lib/content-calendar.js";
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

const queryValue = (value: string[] | string | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";

const contentCalendarHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  const method = req.method ?? "GET";
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    res.setHeader("Allow", ALLOWED_METHODS);
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  const createdBy = authenticate(req);
  if (!createdBy) {
    res
      .status(401)
      .json({ error: "Missing authorized Google session.", ok: false });
    return;
  }

  const sanityWriteToken = readWriteToken();

  if (method === "GET") {
    const result = await listCalendarEntries(
      {
        end: queryValue(req.query.end),
        start: queryValue(req.query.start),
      },
      { sanityWriteToken }
    );
    res.status(result.status).json(result.body);
    return;
  }

  if (method === "POST") {
    const result = await createCalendarEntry(parseBody(req), {
      createdBy,
      sanityWriteToken,
    });
    res.status(result.status).json(result.body);
    return;
  }

  if (method === "PATCH") {
    const result = await updateCalendarEntry(parseBody(req), {
      sanityWriteToken,
    });
    res.status(result.status).json(result.body);
    return;
  }

  const result = await deleteCalendarEntry(queryValue(req.query.id), {
    sanityWriteToken,
  });
  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await contentCalendarHandler(req, res);
  } catch (error) {
    console.error("[api/content-calendar]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected content calendar error.",
        ok: false,
      });
    }
  }
}
