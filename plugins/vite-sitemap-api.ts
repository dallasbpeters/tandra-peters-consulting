import type { Plugin } from "vite";

import { generateSitemapXml } from "../server/seo/sitemapService.js";

const SITEMAP_PATH = "/sitemap.xml";

const pathnameOnly = (url: string | undefined) =>
  (url ?? "").split("?")[0] ?? "";

export const viteSitemapApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== SITEMAP_PATH) {
        next();
        return;
      }

      if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.end("Method Not Allowed");
        return;
      }

      try {
        const xml = await generateSitemapXml(env.VITE_SITE_URL);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(xml);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            detail: error instanceof Error ? error.message : "Unknown error",
            error: "Could not generate sitemap",
          })
        );
      }
    });
  },
  name: "vite-sitemap-api",
});
