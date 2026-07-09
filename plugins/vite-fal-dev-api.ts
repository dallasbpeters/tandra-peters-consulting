/**
 * Serves Fal image and ad-copy routes during Vite dev without `vercel dev`.
 * Requires FAL_KEY in repo-root .env.local.
 */
import type { ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { readRequestBody } from "./request-body";

const FAL_IMAGE_PATH = "/api/fal/generate-image";
const FAL_AD_COPY_PATH = "/api/fal/generate-ad-copy";
const FAL_UPSCALE_PATH = "/api/fal/upscale-image";
const FAL_WHITEBOARD_PATH = "/api/fal/whiteboard-sketch";
const FAL_WHITEBOARD_VIDEO_PATH = "/api/fal/whiteboard-video";
const FAL_PATHS = new Set([
  FAL_IMAGE_PATH,
  FAL_AD_COPY_PATH,
  FAL_UPSCALE_PATH,
  FAL_WHITEBOARD_PATH,
  FAL_WHITEBOARD_VIDEO_PATH,
]);

const sendOptions = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key"
  );
  res.statusCode = 204;
  res.end();
};

const pathnameOnly = (url: string | undefined) =>
  (url ?? "").split("?")[0] ?? "";

const loadFalHandler = (pathname: string) => {
  if (pathname === FAL_AD_COPY_PATH) {
    return import("../api/lib/fal-generate-ad-copy.js");
  }
  if (pathname === FAL_UPSCALE_PATH) {
    return import("../api/lib/fal-upscale-image.js");
  }
  if (pathname === FAL_WHITEBOARD_PATH) {
    return import("../api/lib/fal-whiteboard-sketch.js");
  }
  if (pathname === FAL_WHITEBOARD_VIDEO_PATH) {
    return import("../api/lib/fal-whiteboard-video.js");
  }
  return import("../api/lib/fal-generate-image.js");
};

export const viteFalDevApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    for (const key of [
      "FAL_KEY",
      "FAL_TXSHINGLE_LORA_URL",
      "FAL_WHITEBOARD_LORA_URL",
    ]) {
      if (!process.env[key] && env[key]) {
        process.env[key] = env[key];
      }
    }
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
    server.middlewares.use(async (req, res, next) => {
      const pathname = pathnameOnly(req.url);
      if (!FAL_PATHS.has(pathname)) {
        next();
        return;
      }

      if (req.method === "OPTIONS") {
        sendOptions(res);
        return;
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      if (env.FAL_KEY?.trim()) {
        process.env.FAL_KEY = env.FAL_KEY.trim();
      }
      for (const key of [
        "FAL_AD_COPY_MODEL",
        "GOOGLE_ALLOWED_DOMAIN",
        "GOOGLE_ALLOWED_EMAILS",
        "VITE_GOOGLE_ALLOWED_DOMAIN",
        "VITE_GOOGLE_ALLOWED_EMAILS",
      ]) {
        if (env[key]?.trim()) {
          process.env[key] = env[key].trim();
        }
      }
      if (env.FAL_TXSHINGLE_LORA_URL?.trim()) {
        process.env.FAL_TXSHINGLE_LORA_URL = env.FAL_TXSHINGLE_LORA_URL.trim();
      }

      try {
        const { handler } = await loadFalHandler(pathname);
        const host = req.headers.host ?? "localhost:3001";
        const pathWithQuery = req.url ?? pathname;
        const bodyBuf = await readRequestBody(req);
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value == null) {
            continue;
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              headers.append(key, item);
            }
          } else {
            headers.set(key, value);
          }
        }

        const webReq = new Request(`http://${host}${pathWithQuery}`, {
          body: bodyBuf.length > 0 ? bodyBuf.toString("utf-8") : undefined,
          headers,
          method: "POST",
        });

        const webRes = await handler(webReq);
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          if (key.toLowerCase() === "content-encoding") {
            return;
          }
          res.setHeader(key, value);
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-API-Key"
        );
        res.end(Buffer.from(await webRes.arrayBuffer()));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.statusCode = 500;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  },
  name: "vite-fal-dev-api",
});
