import type { Plugin } from "vite";
import {
  getSeoDashboard,
  regenerateSeoDashboard,
} from "../server/seo/dashboardService.js";
import {
  DashboardAuthError,
  authorizeSeoDashboardRequest,
} from "../server/seo/googleAuth.js";

const DASHBOARD_PATH = "/api/seo/dashboard";

const pathnameOnly = (url: string | undefined) =>
  (url ?? "").split("?")[0] ?? "";

const applyCors = (res: {
  setHeader(name: string, value: string): void;
  statusCode: number;
  end(body?: string): void;
}) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

export const viteSeoDashboardApi = (env: Record<string, string>): Plugin => ({
  name: "vite-seo-dashboard-api",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== DASHBOARD_PATH) {
        next();
        return;
      }

      applyCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      for (const key of [
        "POSTHOG_PERSONAL_API_KEY",
        "POSTHOG_PERSONALAPI_KEY",
        "POSTHOG_PROJECT_ID",
        "POSTHOG_API_HOST",
        "SANITY_API_WRITE_TOKEN",
        "VITE_SITE_URL",
        "VITE_PUBLIC_POSTHOG_HOST",
        "VITE_PUBLIC_POSTHOG_UI_HOST",
        "GEMINI_API_KEY",
      ]) {
        if (env[key]?.trim()) {
          process.env[key] = env[key].trim();
        }
      }
      if (
        !process.env.POSTHOG_PERSONAL_API_KEY &&
        process.env.POSTHOG_PERSONALAPI_KEY
      ) {
        process.env.POSTHOG_PERSONAL_API_KEY =
          process.env.POSTHOG_PERSONALAPI_KEY;
      }

      try {
        await authorizeSeoDashboardRequest(
          typeof req.headers.authorization === "string"
            ? req.headers.authorization
            : undefined,
          env,
        );
        const requestUrl = new URL(
          req.url ?? DASHBOARD_PATH,
          "http://localhost",
        );
        const regenerate =
          requestUrl.searchParams.get("regenerate") === "1" ||
          requestUrl.searchParams.get("regenerate") === "true" ||
          requestUrl.searchParams.get("refresh") === "1" ||
          requestUrl.searchParams.get("refresh") === "true";
        const payload = regenerate
          ? await regenerateSeoDashboard()
          : await getSeoDashboard();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      } catch (error) {
        if (error instanceof DashboardAuthError) {
          res.statusCode = error.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Could not build SEO dashboard",
            detail: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
    });
  },
});
