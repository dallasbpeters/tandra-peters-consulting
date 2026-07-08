import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { getDeskAreaIntel } from "../api/lib/desk-area-intel.js";

const DESK_AREA_INTEL_PATH = "/api/desk-area-intel";
let localEnvCache: Record<string, string> | null = null;

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const setCors = (res: ServerResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const unquoteEnvValue = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const readLocalEnv = (): Record<string, string> => {
  if (localEnvCache) {
    return localEnvCache;
  }

  const values: Record<string, string> = {};
  try {
    const contents = readFileSync(".env.local", "utf-8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      values[trimmed.slice(0, separatorIndex)] = unquoteEnvValue(
        trimmed.slice(separatorIndex + 1)
      );
    }
  } catch {
    // Local dev still works without a repo-root .env.local; it will fall back to process/env.
  }

  localEnvCache = values;
  return values;
};

const envValue = (env: Record<string, string>, key: string): string =>
  env[key]?.trim() ||
  process.env[key]?.trim() ||
  readLocalEnv()[key]?.trim() ||
  "";

const exposeDeskEnv = (env: Record<string, string>): void => {
  const rentcastKey = envValue(env, "RENTCAST_API_KEY");
  if (rentcastKey) {
    process.env.RENTCAST_API_KEY = rentcastKey;
  }
};

const handleDeskAreaIntelRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== DESK_AREA_INTEL_PATH) {
    next();
    return;
  }

  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed", ok: false });
    return;
  }

  exposeDeskEnv(env);
  const result = await getDeskAreaIntel();
  res.setHeader("Cache-Control", "no-store");
  json(res, result.status, result.body);
};

export const viteDeskAreaIntelApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleDeskAreaIntelRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-desk-area-intel-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected Desk area intelligence API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-desk-area-intel-api",
});
