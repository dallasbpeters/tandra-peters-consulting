import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

import { processContactSubmission } from "../server/email/contactSubmission.js";

const CONTACT_PATH = "/api/contact";

const pathnameOnly = (url: string | undefined): string => (url ?? "").split("?")[0] ?? "";

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const parseJson = (buffer: Buffer): Record<string, unknown> => {
  if (!buffer.length) return {};
  try {
    return JSON.parse(buffer.toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const pick = (env: Record<string, string>, key: string): string | undefined =>
  env[key]?.trim() || process.env[key]?.trim() || undefined;

/**
 * Dev-only middleware that mirrors the `/api/contact` Vercel function so the
 * contact form works under `pnpm dev` against local `.env.local` (Resend email
 * + Sanity contact upsert) instead of proxying to stale production. Reuses the
 * same shared `processContactSubmission` core as the serverless handler.
 */
export const viteContactDevApi = (env: Record<string, string>): Plugin => ({
  name: "vite-contact-dev-api",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== CONTACT_PATH) {
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
        res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
        return;
      }

      try {
        const result = await processContactSubmission(parseJson(await readBody(req)), {
          resendApiKey: pick(env, "RESEND_API_KEY"),
          emailFrom: pick(env, "EMAIL_FROM"),
          notificationTo: pick(env, "CONTACT_NOTIFICATION_TO"),
          assetBaseUrl: pick(env, "EMAIL_ASSET_BASE_URL"),
          sanityWriteToken: pick(env, "SANITY_WRITE_TOKEN") || pick(env, "SANITY_API_WRITE_TOKEN"),
        });
        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result.body));
      } catch (error) {
        console.error("[vite-contact-dev-api]", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Unexpected contact API error." }));
      }
    });
  },
});
