/**
 * Vercel serverless: POST /api/desk-direct-mail.
 *
 * Builds a direct-mail batch plan from selected Desk neighborhoods. Recipient
 * matching can use RentCast server-side, but this route does not send mail
 * unless provider credentials and DIRECT_MAIL_SEND_ENABLED are configured.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  createTestPostcard,
  verifyProviderConnection,
} from "./lib/desk-direct-mail-connect.js";
import { prepareDirectMailBatch } from "./lib/desk-direct-mail.js";
import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const runDirectMailAction = async (
  body: Record<string, unknown>
): Promise<{ body: unknown; status: number }> => {
  const action = typeof body.action === "string" ? body.action : "plan";
  const providerKey = typeof body.provider === "string" ? body.provider : "";
  if (action === "verify") {
    const connection = await verifyProviderConnection(providerKey);
    return { body: { connection, ok: true }, status: 200 };
  }
  if (action === "test") {
    const proof = await createTestPostcard({
      back: optionalString(body.back),
      front: optionalString(body.front),
      message: optionalString(body.message),
      providerKey,
      size: optionalString(body.size),
    });
    return { body: { ok: proof.ok, proof }, status: 200 };
  }
  const result = await prepareDirectMailBatch(body);
  return { body: result.body, status: result.status };
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

const authenticate = (req: VercelRequest): boolean => {
  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) {
    return false;
  }
  const user = parseGoogleIdToken(bearer);
  return Boolean(user && isAllowedGoogleUser(user));
};

const deskDirectMailHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  if (!authenticate(req)) {
    res
      .status(401)
      .json({ error: "Missing authorized Google session.", ok: false });
    return;
  }

  const result = await runDirectMailAction(parseBody(req));
  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await deskDirectMailHandler(req, res);
  } catch (error) {
    console.error("[api/desk-direct-mail]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Desk direct-mail error.",
        ok: false,
      });
    }
  }
}
