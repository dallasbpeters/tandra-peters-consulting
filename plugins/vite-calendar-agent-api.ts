import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { parseGoogleIdToken } from "../api/lib/google-auth";
import { readRequestBody } from "./request-body";

const CALENDAR_AGENT_PATH = "/api/calendar-agent";

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

const readEnv = (
  env: Record<string, string>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = env[key]?.trim() || process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return;
};

const handleCalendarAgentRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== CALENDAR_AGENT_PATH) {
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
  if (!(user && isAllowedGoogleUserFromEnv(user, env))) {
    json(res, 401, { error: "Missing authorized Google session.", ok: false });
    return;
  }

  // Dynamically import so the AI SDK only loads in dev when the route is hit.
  const { generateCalendarPlan } = await import("../api/lib/calendar-agent.js");

  const result = await generateCalendarPlan(
    parseJson(await readRequestBody(req)),
    {
      groqApiKey: readEnv(env, "GROQ_API_KEY"),
      sanityToken: readEnv(
        env,
        "SANITY_WRITE_TOKEN",
        "SANITY_API_WRITE_TOKEN",
        "SANITY_API_READ_TOKEN"
      ),
    }
  );

  json(res, result.status, result.body);
};

export const viteCalendarAgentApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleCalendarAgentRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-calendar-agent-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected calendar agent API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-calendar-agent-api",
});
