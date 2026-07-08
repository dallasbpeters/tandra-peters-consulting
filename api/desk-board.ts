/**
 * Vercel serverless: GET/POST/DELETE /api/desk-board.
 *
 * Tandra's Desk board — work tasks and content-calendar entries. Stored as
 * Sanity drafts (no PII), Google-auth gated to the allowlist like
 * /api/desk-targets.
 *
 *   GET  ?kind=task|content   → { ok, items: [...] }
 *   POST { title, kind, ... } → { ok, item }   (create or update by id / seedKey)
 *   DELETE ?id=...            → { ok }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  deleteBoardItem,
  listBoardItems,
  saveBoardItem,
} from "./lib/desk-board.js";
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

const deskBoardHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  const method = req.method ?? "GET";
  if (!["GET", "POST", "DELETE"].includes(method)) {
    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
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
    const kind =
      typeof req.query.kind === "string" ? req.query.kind : undefined;
    const result = await listBoardItems({ kind, sanityWriteToken });
    res.status(result.status).json(result.body);
    return;
  }

  if (method === "DELETE") {
    const id =
      typeof req.query.id === "string" ? req.query.id : parseBody(req).id;
    const result = await deleteBoardItem(id, { sanityWriteToken });
    res.status(result.status).json(result.body);
    return;
  }

  const result = await saveBoardItem(parseBody(req), {
    createdBy,
    sanityWriteToken,
  });
  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await deskBoardHandler(req, res);
  } catch (error) {
    console.error("[api/desk-board]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Desk board error.",
        ok: false,
      });
    }
  }
}
