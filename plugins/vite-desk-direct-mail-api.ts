import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { prepareDirectMailBatch } from "../api/lib/desk-direct-mail.js";
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
    "LOB_API_KEY",
    "LOB_FROM_ADDRESS_ID",
    "CLICK2MAIL_USERNAME",
    "CLICK2MAIL_PASSWORD",
    "POSTGRID_API_KEY",
    "POSTALYTICS_API_KEY",
  ]) {
    const value = env[key]?.trim() || process.env[key]?.trim();
    if (value) {
      process.env[key] = value;
    }
  }
};

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
  const result = await prepareDirectMailBatch(
    parseJson(await readRequestBody(req))
  );
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
