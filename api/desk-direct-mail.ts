/**
 * Vercel serverless: POST /api/desk-direct-mail.
 *
 * Builds a direct-mail batch plan from selected Desk neighborhoods. Recipient
 * matching can use RentCast server-side, but this route does not send mail
 * unless provider credentials and DIRECT_MAIL_SEND_ENABLED are configured.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { ReturnAddress } from "./lib/desk-direct-mail-connect.js";
import {
  createTestPostcard,
  submitToProvider,
  verifyProviderConnection,
} from "./lib/desk-direct-mail-connect.js";
import {
  collectSubmitRecipients,
  prepareDirectMailAddresses,
  prepareDirectMailBatch,
} from "./lib/desk-direct-mail.js";
import {
  getProviderSecrets,
  providerKeysStatus,
  saveProviderKeys,
} from "./lib/desk-mail-secrets.js";
import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const parseReturnAddress = (value: unknown): ReturnAddress | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const field = (key: string): string =>
    typeof record[key] === "string" ? (record[key] as string) : "";
  return {
    city: field("city"),
    company: field("company"),
    line1: field("line1"),
    line2: field("line2"),
    name: field("name"),
    state: field("state"),
    zip: field("zip"),
  };
};

const sendEnabled = (): boolean =>
  process.env.DIRECT_MAIL_SEND_ENABLED?.trim().toLowerCase() === "true";

const runDirectMailAction = async (
  body: Record<string, unknown>,
  sanityWriteToken: string | undefined
): Promise<{ body: unknown; status: number }> => {
  const action = typeof body.action === "string" ? body.action : "plan";
  const providerKey = typeof body.provider === "string" ? body.provider : "";
  const options = { sanityWriteToken };

  if (action === "verify") {
    const secrets = await getProviderSecrets(providerKey, options);
    const connection = await verifyProviderConnection(providerKey, secrets);
    return { body: { connection, ok: true }, status: 200 };
  }
  if (action === "keys-status") {
    const status = await providerKeysStatus(providerKey, options);
    return { body: { ok: true, status }, status: 200 };
  }
  if (action === "save-keys") {
    const result = await saveProviderKeys(providerKey, body.values, options);
    return { body: result.body, status: result.status };
  }
  if (action === "test") {
    const secrets = await getProviderSecrets(providerKey, options);
    const proof = await createTestPostcard(
      {
        back: optionalString(body.back),
        body: optionalString(body.body),
        cta: optionalString(body.cta),
        front: optionalString(body.front),
        frontConfig: optionalString(body.frontConfig),
        headline: optionalString(body.headline),
        message: optionalString(body.message),
        providerKey,
        qrDataUri: optionalString(body.qrDataUri),
        size: optionalString(body.size),
      },
      secrets
    );
    return { body: { ok: proof.ok, proof }, status: 200 };
  }
  if (action === "submit") {
    const secrets = await getProviderSecrets(providerKey, options);
    // Rebuild the FULL recipient list server-side from the zone/neighborhoods so
    // the order covers the whole audience — never the client's preview sample.
    const batch = await collectSubmitRecipients(body);
    const submission = await submitToProvider(
      {
        back: optionalString(body.back),
        batchName: optionalString(body.batchName),
        body: optionalString(body.body),
        cta: optionalString(body.cta),
        front: optionalString(body.front),
        frontConfig: optionalString(body.frontConfig),
        headline: optionalString(body.headline),
        message: optionalString(body.message),
        providerKey,
        qrDataUri: optionalString(body.qrDataUri),
        recipients: stringList(body.recipients),
        returnAddress: parseReturnAddress(body.returnAddress),
        size: optionalString(body.size),
        structuredRecipients: batch.recipients,
        totalMatched: batch.totalMatched,
        zoneLabel: optionalString(body.zoneLabel),
      },
      secrets,
      sendEnabled()
    );
    return { body: { ok: submission.ok, submission }, status: 200 };
  }
  if (action === "addresses") {
    const addresses = await prepareDirectMailAddresses(body);
    return { body: addresses.body, status: addresses.status };
  }
  if (action === "recipients") {
    // Full structured recipient list for the zone — reuses the SAME server-side
    // audience path as a provider submit, so self-mailing covers every
    // deliverable address (not the client's ~60-address preview sample).
    const batch = await collectSubmitRecipients(body);
    return {
      body: {
        ok: true,
        recipients: batch.recipients,
        status: batch.status,
        totalMatched: batch.totalMatched,
      },
      status: 200,
    };
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

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

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

  const result = await runDirectMailAction(parseBody(req), readWriteToken());
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
