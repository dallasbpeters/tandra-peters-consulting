import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";

import {
  parseAllowedUnsplashImageUrl,
  readUnsplashAccessKey,
  searchUnsplashImages,
} from "../api/lib/unsplash";

const UNSPLASH_SEARCH_PATH = "/api/unsplash-search";
const UNSPLASH_IMAGE_PATH = "/api/unsplash-image";

const pathnameOnly = (url: string | undefined) => (url ?? "").split("?")[0] ?? "";

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export const viteUnsplashApi = (env: Record<string, string | undefined>): Plugin => ({
  name: "vite-unsplash-api",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = pathnameOnly(req.url);
      if (pathname !== UNSPLASH_SEARCH_PATH && pathname !== UNSPLASH_IMAGE_PATH) {
        next();
        return;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      const requestUrl = new URL(req.url ?? pathname, "http://dev");

      if (pathname === UNSPLASH_SEARCH_PATH) {
        const accessKey = readUnsplashAccessKey(env);
        if (!accessKey) {
          sendJson(res, 500, {
            error: "UNSPLASH_ACCESS_KEY is not configured.",
          });
          return;
        }

        const query = requestUrl.searchParams.get("query")?.trim() ?? "";
        if (query.length < 2) {
          sendJson(res, 200, { images: [] });
          return;
        }

        try {
          const images = await searchUnsplashImages({
            accessKey,
            query,
            page: Number(requestUrl.searchParams.get("page") ?? "1"),
          });
          res.setHeader("Cache-Control", "no-store");
          sendJson(res, 200, { images });
        } catch (error) {
          sendJson(res, 502, {
            error: error instanceof Error ? error.message : "Could not search Unsplash.",
          });
        }
        return;
      }

      const imageUrl = parseAllowedUnsplashImageUrl(requestUrl.searchParams.get("url"));
      if (!imageUrl) {
        sendJson(res, 400, { error: "Invalid Unsplash image URL." });
        return;
      }

      try {
        const upstream = await fetch(imageUrl);
        if (!upstream.ok) {
          sendJson(res, upstream.status, { error: "Could not fetch image." });
          return;
        }

        const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          sendJson(res, 415, { error: "URL did not return an image." });
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-store");
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (error) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : "Could not fetch image.",
        });
      }
    });
  },
});
