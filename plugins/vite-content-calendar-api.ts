import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import {
  createCalendarEntry,
  deleteCalendarEntry,
  listCalendarEntries,
  updateCalendarEntry,
} from "../api/lib/content-calendar.js";
import { parseGoogleIdToken } from "../api/lib/google-auth";
import { readRequestBody } from "./request-body";

const CONTENT_CALENDAR_PATH = "/api/content-calendar";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const queryParams = (url: string | undefined): URLSearchParams => {
  const query = (url ?? "").split("?")[1] ?? "";
  return new URLSearchParams(query);
};

const setCors = (res: ServerResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
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

const handleContentCalendarRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== CONTENT_CALENDAR_PATH) {
    next();
    return;
  }

  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const method = req.method ?? "GET";
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    json(res, 405, { error: "Method not allowed", ok: false });
    return;
  }

  const bearer = parseBearerToken(req.headers.authorization);
  const user = bearer ? parseGoogleIdToken(bearer) : null;
  if (!(user && isAllowedGoogleUserFromEnv(user, env))) {
    json(res, 401, { error: "Missing authorized Google session.", ok: false });
    return;
  }

  const sanityWriteToken = readWriteToken(env);
  const params = queryParams(req.url);

  if (method === "GET") {
    const result = await listCalendarEntries(
      {
        end: params.get("end") ?? undefined,
        start: params.get("start") ?? undefined,
      },
      { sanityWriteToken }
    );
    json(res, result.status, result.body);
    return;
  }

  if (method === "POST") {
    const result = await createCalendarEntry(
      parseJson(await readRequestBody(req)),
      { createdBy: user.email, sanityWriteToken }
    );
    json(res, result.status, result.body);
    return;
  }

  if (method === "PATCH") {
    const result = await updateCalendarEntry(
      parseJson(await readRequestBody(req)),
      { sanityWriteToken }
    );
    json(res, result.status, result.body);
    return;
  }

  const result = await deleteCalendarEntry(params.get("id"), {
    sanityWriteToken,
  });
  json(res, result.status, result.body);
};

export const viteContentCalendarApi = (
  env: Record<string, string>
): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleContentCalendarRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-content-calendar-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected content calendar API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-content-calendar-api",
});
