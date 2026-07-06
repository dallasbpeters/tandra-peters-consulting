import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import analyticsHandler from "../api/analytics";

const ANALYTICS_PATH = "/api/analytics";

/**
 * Env vars the analytics API handler reads off `process.env`. Vite's `loadEnv`
 * reads `.env.local` into a plain object but does NOT populate `process.env`,
 * so local dev needs this bridge.
 */
const GA_ENV_KEYS = [
  "GA_PROPERTY_ID",
  "GA_SERVICE_ACCOUNT_EMAIL",
  "GA_PRIVATE_KEY",
] as const;

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const queryFromUrl = (req: IncomingMessage): Record<string, string> => {
  const host = req.headers.host ?? "localhost:3001";
  const url = new URL(req.url ?? ANALYTICS_PATH, `http://${host}`);
  return Object.fromEntries(url.searchParams.entries());
};

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const createResponseAdapter = (res: ServerResponse) => {
  const adapter = {
    end: (body?: string | Buffer) => {
      res.end(body);
      return adapter;
    },
    json: (body: unknown) => {
      if (!res.hasHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json");
      }
      res.end(JSON.stringify(body));
      return adapter;
    },
    setHeader: (key: string, value: number | string | readonly string[]) => {
      res.setHeader(key, value);
      return adapter;
    },
    status: (code: number) => {
      res.statusCode = code;
      return adapter;
    },
  };

  return adapter;
};

export const viteAnalyticsApi = (env: Record<string, string> = {}): Plugin => ({
  name: "vite-analytics-api",
  configureServer(server) {
    // Hydrate process.env from the Vite-loaded env (.env.local) so the
    // ga-dashboard plugin's GET handler can read its GA_* config.
    for (const key of GA_ENV_KEYS) {
      if (!process.env[key] && env[key]) {
        process.env[key] = env[key];
      }
    }

    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== ANALYTICS_PATH) {
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
        res.statusCode = 405;
        res.setHeader("Allow", "GET, OPTIONS");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      try {
        setCors(res);
        await analyticsHandler(
          {
            headers: req.headers,
            method: req.method,
            query: queryFromUrl(req),
          } as never,
          createResponseAdapter(res) as never
        );
      } catch (error) {
        console.error("[vite-analytics-api]", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Failed to load analytics dashboard data." })
        );
      }
    });
  },
});
