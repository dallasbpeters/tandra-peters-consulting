import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { generateBoardPlan } from "../api/lib/desk-plan.js";
import type { DeskPlanMode } from "../api/lib/desk-plan.js";
import { parseGoogleIdToken } from "../api/lib/google-auth";
import { readRequestBody } from "./request-body";

const DESK_PLAN_PATH = "/api/desk-plan";

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

const readWriteToken = (env: Record<string, string>): string | undefined =>
  env.SANITY_WRITE_TOKEN?.trim() ||
  env.SANITY_API_WRITE_TOKEN?.trim() ||
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const readGroqKey = (env: Record<string, string>): string | undefined =>
  env.GROQ_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim() || undefined;

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

const normalizeMode = (value: unknown): DeskPlanMode =>
  value === "content" ? "content" : "tasks";

const handleDeskPlanRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== DESK_PLAN_PATH) {
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
  const createdBy =
    user && isAllowedGoogleUserFromEnv(user, env) ? user.email : "local-dev";

  const body = parseJson(await readRequestBody(req));
  const result = await generateBoardPlan({
    createdBy,
    groqKey: readGroqKey(env),
    mode: normalizeMode(body.mode),
    sanityWriteToken: readWriteToken(env),
  });
  json(res, result.status, result.body);
};

export const viteDeskPlanApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleDeskPlanRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-desk-plan-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected Desk plan API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-desk-plan-api",
});
