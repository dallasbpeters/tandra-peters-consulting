import type { VercelRequest, VercelResponse } from "@vercel/node";

import { generateSitemapXml } from "../server/seo/sitemapService.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const xml = await generateSitemapXml(process.env.VITE_SITE_URL);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).json({
      detail: error instanceof Error ? error.message : "Unknown error",
      error: "Could not generate sitemap",
    });
  }
}
