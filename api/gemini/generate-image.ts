/**
 * Vercel: POST /api/gemini/generate-image — Gemini image generation for Sanity Studio
 * (sanity-plugin-gemini-ai-images client + api/lib/gemini-generate-image.ts handler).
 *
 * Env: GEMINI_API_KEY (required).
 * Optional: GEMINI_PLUGIN_API_KEY (require X-API-Key), GEMINI_IMAGE_MODEL (default gemini-3.1-flash-image).
 *
 * Local: `pnpm dev` (Vite port 3001) serves this route via `plugins/viteGeminiDevApi.ts`.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handler as geminiHandler } from "../lib/gemini-generate-image.js";
import { enrichGeminiErrorResponse } from "../lib/gemini-error.js";

const addCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key",
  );
};

const toWebRequest = (req: VercelRequest): Request => {
  const host = req.headers.host ?? "localhost";
  const path = req.url?.startsWith("http")
    ? req.url
    : `https://${host}${req.url ?? "/"}`;
  const headerPairs: [string, string][] = [];
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        headerPairs.push([key, v]);
      }
    } else {
      headerPairs.push([key, value]);
    }
  }
  const body =
    req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
      ? typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {})
      : undefined;
  return new Request(path, {
    method: req.method,
    headers: new Headers(headerPairs),
    body,
  });
};

const sendWebResponse = async (res: VercelResponse, webRes: Response) => {
  const headers = new Headers(webRes.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key",
  );
  res.status(webRes.status);
  headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.send(Buffer.from(await webRes.arrayBuffer()));
};

export default async function geminiGenerateImage(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method === "OPTIONS") {
    addCors(res);
    res.status(204).end();
    return;
  }

  const webRes = await enrichGeminiErrorResponse(
    await geminiHandler(toWebRequest(req)),
  );
  await sendWebResponse(res, webRes);
}
