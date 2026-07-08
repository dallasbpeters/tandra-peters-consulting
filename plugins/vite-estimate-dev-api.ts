import type { Plugin } from "vite";

import { processEstimateSubmission } from "../server/email/estimateSubmission.js";
import { readRequestBody } from "./request-body";

const ESTIMATE_PATH = "/api/estimate";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

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

const pick = (env: Record<string, string>, key: string): string | undefined =>
  env[key]?.trim() || process.env[key]?.trim() || undefined;

/**
 * Dev-only middleware that mirrors the `/api/estimate` Vercel function so the
 * estimator email works under `pnpm dev` against local `.env.local`. Reuses the
 * same shared `processEstimateSubmission` core as the serverless handler.
 */
export const viteEstimateDevApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== ESTIMATE_PATH) {
        next();
        return;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed", ok: false }));
        return;
      }

      try {
        const result = await processEstimateSubmission(
          parseJson(await readRequestBody(req)),
          {
            assetBaseUrl: pick(env, "EMAIL_ASSET_BASE_URL"),
            emailFrom: pick(env, "EMAIL_FROM"),
            notificationTo: pick(env, "CONTACT_NOTIFICATION_TO"),
            resendApiKey: pick(env, "RESEND_API_KEY"),
            sanityWriteToken:
              pick(env, "SANITY_WRITE_TOKEN") ||
              pick(env, "SANITY_API_WRITE_TOKEN"),
          }
        );
        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result.body));
      } catch (error) {
        console.error("[vite-estimate-dev-api]", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Unexpected estimate API error.",
            ok: false,
          })
        );
      }
    });
  },
  name: "vite-estimate-dev-api",
});
