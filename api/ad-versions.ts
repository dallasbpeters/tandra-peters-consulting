import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createClient } from "@sanity/client";

import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_CONFIG_BYTES = 200_000;

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() || process.env.SANITY_API_WRITE_TOKEN?.trim() || undefined;

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const sanitizeString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) {
    res.status(401).json({ error: "Missing Google authorization token." });
    return;
  }

  const user = parseGoogleIdToken(bearer);
  if (!user || !isAllowedGoogleUser(user)) {
    res.status(403).json({ error: "Google account is not authorized for ad versions." });
    return;
  }

  const token = readWriteToken();
  if (!token) {
    res.status(500).json({
      error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    });
    return;
  }

  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
  });

  try {
    const body = (req.body ?? {}) as {
      id?: unknown;
      name?: unknown;
      config?: unknown;
    };

    if (req.method === "DELETE") {
      const id = sanitizeString(body.id);
      if (!id) {
        res.status(400).json({ error: "Missing version id." });
        return;
      }
      await client.delete(id);
      res.status(200).json({ ok: true, id });
      return;
    }

    const name = sanitizeString(body.name);
    const config = sanitizeString(body.config);
    if (!name || !config) {
      res.status(400).json({ error: "Missing version name or config." });
      return;
    }
    if (Buffer.byteLength(config, "utf8") > MAX_CONFIG_BYTES) {
      res.status(413).json({ error: "Config payload is too large." });
      return;
    }

    const created = await client.create({
      _type: "adCreativeVersion",
      name,
      config,
      savedAt: new Date().toISOString(),
      savedBy: user.email,
    });

    res.status(200).json({ ok: true, id: created._id, name: created.name });
  } catch (error) {
    console.error("[api/ad-versions]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected ad version error.",
    });
  }
}
