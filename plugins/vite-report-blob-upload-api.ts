/**
 * Serves POST /api/report-blob-upload during `vite` dev so the Photo Report
 * library can mint Vercel Blob client-upload tokens locally without running
 * `vercel dev`. Mirrors api/report-blob-upload.ts. Requires
 * BLOB_READ_WRITE_TOKEN in repo-root `.env.local`. Auth is skipped in dev — the
 * production route stays Google-gated.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import type { Plugin } from "vite";

import { readRequestBody } from "./request-body";

const PATH = "/api/report-blob-upload";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

export const viteReportBlobUploadApi = (
  env: Record<string, string>
): Plugin => ({
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== PATH) {
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
        json(res, 405, { error: "Method not allowed" });
        return;
      }

      const token = env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        json(res, 500, { error: "BLOB_READ_WRITE_TOKEN not set" });
        return;
      }

      // @vercel/blob derives the completion callback URL from the request host
      // in production, but the Vite middleware request lacks the fields it
      // inspects, so it warns on every token mint. The callback can never reach
      // localhost anyway (so onUploadCompleted never fires in dev); set the URL
      // explicitly just to silence the noise.
      if (!process.env.VERCEL_BLOB_CALLBACK_URL && req.headers.host) {
        process.env.VERCEL_BLOB_CALLBACK_URL = `http://${req.headers.host}${PATH}`;
      }

      try {
        const raw = await readRequestBody(req);
        const body = JSON.parse(raw.toString()) as HandleUploadBody;
        const jsonResponse = await handleUpload({
          body,
          onBeforeGenerateToken: () =>
            Promise.resolve({
              addRandomSuffix: true,
              allowedContentTypes: ALLOWED_CONTENT_TYPES,
            }),
          onUploadCompleted: () => Promise.resolve(),
          request: req as unknown as IncomingMessage,
          token,
        });
        json(res, 200, jsonResponse);
      } catch (error) {
        console.error("[vite-report-blob-upload-api]", error);
        json(res, 400, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  },
  name: "vite-report-blob-upload-api",
});
