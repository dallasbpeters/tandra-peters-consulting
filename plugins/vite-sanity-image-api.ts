import type { Plugin } from "vite";

import { sanityImageUrl } from "../src/sanity/image-url";

const SANITY_IMAGE_PATH = "/api/sanity-image";
const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";

const pathnameOnly = (url: string | undefined) =>
  (url ?? "").split("?")[0] ?? "";

const parseAllowedSanityImageUrl = (raw: string | null): URL | null => {
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io") {
      return null;
    }

    const allowedPrefix = `/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/`;
    if (!url.pathname.startsWith(allowedPrefix)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

export const viteSanityImageApi = (): Plugin => ({
  configureServer(server) {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== SANITY_IMAGE_PATH) {
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
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      const requestUrl = new URL(req.url ?? SANITY_IMAGE_PATH, "http://dev");
      const imageUrl = parseAllowedSanityImageUrl(
        requestUrl.searchParams.get("url")
      );

      if (!imageUrl) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid Sanity image URL." }));
        return;
      }

      try {
        const upstream = await fetch(sanityImageUrl(imageUrl.toString()));
        if (!upstream.ok) {
          res.statusCode = upstream.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Could not fetch image." }));
          return;
        }

        const contentType =
          upstream.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          res.statusCode = 415;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "URL did not return an image." }));
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-store");
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              error instanceof Error ? error.message : "Could not fetch image.",
          })
        );
      }
    });
  },
  name: "vite-sanity-image-api",
});
