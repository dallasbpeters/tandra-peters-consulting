import type { ServerResponse } from "node:http";

import { GET as pluginAnalyticsGet } from "sanity-plugin-ga-dashboard/api";
import type { Plugin } from "vite";

const ANALYTICS_PATH = "/api/analytics";

/**
 * Env vars the `sanity-plugin-ga-dashboard/api` GET handler reads off
 * `process.env`. Vite's `loadEnv` reads `.env.local` into a plain object but
 * does NOT populate `process.env`, so without this the plugin reports
 * "GA_PROPERTY_ID not configured" in local dev.
 */
const GA_ENV_KEYS = [
  "GA_PROPERTY_ID",
  "GA_SERVICE_ACCOUNT_EMAIL",
  "GA_PRIVATE_KEY",
] as const;

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
        const host = req.headers.host ?? "localhost:3001";
        const url = req.url?.startsWith("http")
          ? req.url
          : `http://${host}${req.url ?? ANALYTICS_PATH}`;
        const webRequest = new Request(url, {
          method: "GET",
          headers: new Headers(
            Object.entries(req.headers)
              .flatMap(([key, value]) => {
                if (value == null) {
                  return [] as [string, string][];
                }
                if (Array.isArray(value)) {
                  return value.map((item) => [key, item] as [string, string]);
                }
                return [[key, value] as [string, string]];
              })
              .filter((entry): entry is [string, string] => Boolean(entry[1]))
          ),
        });

        const webResponse = await pluginAnalyticsGet(webRequest);
        res.statusCode = webResponse.status;
        webResponse.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        setCors(res);
        res.end(Buffer.from(await webResponse.arrayBuffer()));
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
