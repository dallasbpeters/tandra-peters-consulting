import type { VercelRequest, VercelResponse } from "@vercel/node";

import { readUnsplashAccessKey, searchUnsplashImages } from "./lib/unsplash.js";

const queryValue = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const accessKey = readUnsplashAccessKey();
  if (!accessKey) {
    res.status(500).json({ error: "UNSPLASH_ACCESS_KEY is not configured." });
    return;
  }

  const query = queryValue(req.query.query)?.trim() ?? "";
  if (query.length < 2) {
    res.status(200).json({ images: [] });
    return;
  }

  try {
    const images = await searchUnsplashImages({
      accessKey,
      query,
      page: Number(queryValue(req.query.page) ?? "1"),
    });
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=900");
    res.status(200).json({ images });
  } catch (error) {
    res.status(502).json({
      error:
        error instanceof Error ? error.message : "Could not search Unsplash.",
    });
  }
}
