import type { VercelRequest, VercelResponse } from "@vercel/node";

import { GET as pluginAnalyticsGet } from "sanity-plugin-ga-dashboard/api";

/**
 * Comma-separated absolute origins allowed to call /api/analytics, e.g.
 * GA_DASHBOARD_ALLOWED_ORIGINS=https://on6anif3y43e3t03oiwrgp30.sanity.studio,https://www.tandra.me
 */
const ENV_ALLOWED_ORIGINS = "GA_DASHBOARD_ALLOWED_ORIGINS";

const LOCAL_ALLOWED_ORIGINS = [
  "http://localhost:3333",
  "http://127.0.0.1:3333",
];

const isProduction = process.env.NODE_ENV === "production";

const parseAllowedOrigins = (): string[] => {
  const fromEnv = process.env[ENV_ALLOWED_ORIGINS]?.trim();
  if (!fromEnv) {
    return isProduction ? [] : LOCAL_ALLOWED_ORIGINS;
  }

  return fromEnv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const resolveCorsOrigin = (origin: string | undefined): string | undefined => {
  const allowedOrigins = parseAllowedOrigins();
  if (!origin) {
    return;
  }
  return allowedOrigins.includes(origin) ? origin : undefined;
};

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }
  return Boolean(resolveCorsOrigin(origin));
};

const applyCors = (res: VercelResponse, origin: string | undefined) => {
  const corsOrigin = resolveCorsOrigin(origin);
  if (!corsOrigin) {
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
};

const toWebRequest = (req: VercelRequest): Request => {
  const host = req.headers.host ?? "localhost";
  const rawPath = req.url ?? "/";
  const path = rawPath.startsWith("http")
    ? rawPath
    : `https://${host}${rawPath}`;

  const headerPairs: [string, string][] = [];
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headerPairs.push([key, item]);
      }
      continue;
    }

    headerPairs.push([key, value]);
  }

  return new Request(path, {
    method: req.method,
    headers: new Headers(headerPairs),
  });
};

const sendWebResponse = async (
  res: VercelResponse,
  webResponse: Response,
  origin: string | undefined
) => {
  res.status(webResponse.status);

  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  applyCors(res, origin);
  res.send(Buffer.from(await webResponse.arrayBuffer()));
};

export default async function analyticsHandler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string | undefined;

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const webRequest = toWebRequest(req);
    const webResponse = await pluginAnalyticsGet(webRequest);
    await sendWebResponse(res, webResponse, origin);
  } catch (error) {
    console.error("[api/analytics]", error);
    applyCors(res, origin);
    res.status(500).json({ error: "Failed to load analytics dashboard data." });
  }
}
