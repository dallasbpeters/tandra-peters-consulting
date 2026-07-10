import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import type { ReturnAddress } from "../api/lib/desk-direct-mail-connect.js";
import {
  createTestPostcard,
  submitToProvider,
  verifyProviderConnection,
} from "../api/lib/desk-direct-mail-connect.js";
import {
  collectSubmitRecipients,
  prepareDirectMailAddresses,
  prepareDirectMailBatch,
} from "../api/lib/desk-direct-mail.js";
import {
  getProviderSecrets,
  providerKeysStatus,
  saveProviderKeys,
} from "../api/lib/desk-mail-secrets.js";
import { parseGoogleIdToken } from "../api/lib/google-auth";
import { readRequestBody } from "./request-body";

const DESK_DIRECT_MAIL_PATH = "/api/desk-direct-mail";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const setCors = (res: ServerResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const isAllowedGoogleUserFromEnv = (
  user: { email: string; hostedDomain?: string },
  env: Record<string, string>
): boolean => {
  const emails = new Set(
    (env.GOOGLE_ALLOWED_EMAILS ?? env.VITE_GOOGLE_ALLOWED_EMAILS ?? "")
      .split(",")
      .map((entry) => normalize(entry))
      .filter(Boolean)
  );
  const domain = normalize(
    env.GOOGLE_ALLOWED_DOMAIN ?? env.VITE_GOOGLE_ALLOWED_DOMAIN ?? ""
  );
  const email = normalize(user.email);

  if (emails.has(email)) {
    return true;
  }
  return Boolean(domain && normalize(user.hostedDomain ?? "") === domain);
};

const exposeEnv = (env: Record<string, string>): void => {
  for (const key of [
    "RENTCAST_API_KEY",
    "DIRECT_MAIL_PROVIDER",
    "DIRECT_MAIL_SEND_ENABLED",
    "DIRECT_MAIL_SECRET_KEY",
    "SANITY_WRITE_TOKEN",
    "SANITY_API_WRITE_TOKEN",
    "STANNP_API_KEY",
    "LOB_API_KEY",
    "LOB_FROM_ADDRESS_ID",
    "POSTGRID_API_KEY",
    "POSTGRID_FROM_CONTACT_ID",
    "POSTGRID_FROM_NAME",
    "POSTGRID_FROM_ADDRESS_LINE1",
    "POSTGRID_FROM_CITY",
    "POSTGRID_FROM_STATE",
    "POSTGRID_FROM_ZIP",
    "POSTALYTICS_API_KEY",
    "POSTALYTICS_SEND_ENDPOINT",
  ]) {
    const value = env[key]?.trim() || process.env[key]?.trim();
    if (value) {
      process.env[key] = value;
    }
  }
};

const readWriteToken = (env: Record<string, string>): string | undefined =>
  env.SANITY_WRITE_TOKEN?.trim() ||
  env.SANITY_API_WRITE_TOKEN?.trim() ||
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const sendEnabledFrom = (env: Record<string, string>): boolean =>
  (env.DIRECT_MAIL_SEND_ENABLED ?? process.env.DIRECT_MAIL_SEND_ENABLED ?? "")
    .trim()
    .toLowerCase() === "true";

const parseJson = (buffer: Buffer): Record<string, unknown> => {
  if (!buffer.length) {
    return {};
  }
  try {
    return JSON.parse(buffer.toString("utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const handleDeskDirectMailRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== DESK_DIRECT_MAIL_PATH) {
    next();
    return;
  }

  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed", ok: false });
    return;
  }

  const bearer = parseBearerToken(req.headers.authorization);
  const user = bearer ? parseGoogleIdToken(bearer) : null;
  const isAllowed = user ? isAllowedGoogleUserFromEnv(user, env) : true;
  if (!isAllowed) {
    json(res, 401, { error: "Missing authorized Google session.", ok: false });
    return;
  }

  exposeEnv(env);
  const body = parseJson(await readRequestBody(req));
  const action = typeof body.action === "string" ? body.action : "plan";
  const providerKey = typeof body.provider === "string" ? body.provider : "";
  const options = { sanityWriteToken: readWriteToken(env) };
  const optionalString = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;
  const stringList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  // biome-ignore lint/correctness/noUnusedVariables: used at parseReturnAddress(body.returnAddress) below
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

  if (action === "verify") {
    const secrets = await getProviderSecrets(providerKey, options);
    const connection = await verifyProviderConnection(providerKey, secrets);
    json(res, 200, { connection, ok: true });
    return;
  }
  if (action === "keys-status") {
    const status = await providerKeysStatus(providerKey, options);
    json(res, 200, { ok: true, status });
    return;
  }
  if (action === "save-keys") {
    const result = await saveProviderKeys(providerKey, body.values, options);
    json(res, result.status, result.body);
    return;
  }
  if (action === "test") {
    const secrets = await getProviderSecrets(providerKey, options);
    const proof = await createTestPostcard(
      {
        back: optionalString(body.back),
        body: optionalString(body.body),
        cta: optionalString(body.cta),
        front: optionalString(body.front),
        headline: optionalString(body.headline),
        message: optionalString(body.message),
        providerKey,
        qrDataUri: optionalString(body.qrDataUri),
        size: optionalString(body.size),
      },
      secrets
    );
    json(res, 200, { ok: proof.ok, proof });
    return;
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
      sendEnabledFrom(env)
    );
    json(res, 200, { ok: submission.ok, submission });
    return;
  }
  if (action === "addresses") {
    const addresses = await prepareDirectMailAddresses(body);
    json(res, addresses.status, addresses.body);
    return;
  }

  const result = await prepareDirectMailBatch(body);
  json(res, result.status, result.body);
};

export const viteDeskDirectMailApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleDeskDirectMailRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-desk-direct-mail-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected Desk direct-mail API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-desk-direct-mail-api",
});
