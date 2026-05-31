import type { VercelRequest, VercelResponse } from "@vercel/node";

import { parseAllowedUnsplashImageUrl } from "./lib/unsplash.js";

const queryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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

  const imageUrl = parseAllowedUnsplashImageUrl(queryValue(req.query.url));
  if (!imageUrl) {
    res.status(400).json({ error: "Invalid Unsplash image URL." });
    return;
  }

  const upstream = await fetch(imageUrl);
  if (!upstream.ok) {
    res.status(upstream.status).json({ error: "Could not fetch image." });
    return;
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    res.status(415).json({ error: "URL did not return an image." });
    return;
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(Buffer.from(await upstream.arrayBuffer()));
}
