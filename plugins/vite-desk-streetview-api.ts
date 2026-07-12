import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import {
  readStreetViewKey,
  streetViewImage,
  streetViewMetadata,
  streetViewParamsFrom,
} from "../api/lib/desk-streetview.js";

const DESK_STREETVIEW_PATH = "/api/desk-streetview";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const setCors = (res: ServerResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization");
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

// Dev mirror reads the server-side key from Vite `env` first, then the process
// env (never a VITE_-prefixed value — the key must stay off the client).
const resolveKey = (env: Record<string, string>): string | undefined =>
  readStreetViewKey({ ...process.env, ...env });

const queryFrom = (url: string | undefined): Record<string, string> => {
  const search = (url ?? "").split("?")[1] ?? "";
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
};

const handleStreetViewRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== DESK_STREETVIEW_PATH) {
    next();
    return;
  }

  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed", ok: false });
    return;
  }

  const query = queryFrom(req.url);
  const params = streetViewParamsFrom(query);
  const apiKey = resolveKey(env);

  if (query.mode === "image") {
    const image = await streetViewImage(params, { apiKey });
    if (image.ok) {
      res.statusCode = 200;
      res.setHeader("Content-Type", image.contentType);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.end(Buffer.from(image.body));
      return;
    }
    json(res, image.status, { ok: false, reason: image.reason });
    return;
  }

  const meta = await streetViewMetadata(params, { apiKey });
  json(res, 200, { ...meta, ok: true });
};

export const viteDeskStreetViewApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleStreetViewRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-desk-streetview-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected Street View API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-desk-streetview-api",
});
