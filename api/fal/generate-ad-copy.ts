/**
 * Vercel: POST /api/fal/generate-ad-copy — fal-hosted ad-copy generation.
 *
 * Env: FAL_KEY (required), FAL_AD_COPY_MODEL (optional).
 * Local dev is served by plugins/viteFalDevApi.ts.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handler as falHandler } from "../lib/fal-generate-ad-copy.js";

const toWebRequest = (req: VercelRequest): Request => {
  const host = req.headers.host ?? "localhost";
  const path = req.url?.startsWith("http")
    ? req.url
    : `https://${host}${req.url ?? "/"}`;
  const headerPairs: [string, string][] = [];
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headerPairs.push([key, item]);
      }
    } else {
      headerPairs.push([key, value]);
    }
  }
  return new Request(path, {
    body: req.method === "POST" ? JSON.stringify(req.body ?? {}) : undefined,
    headers: new Headers(headerPairs),
    method: req.method,
  });
};

const sendWebResponse = async (
  res: VercelResponse,
  webResponse: Response
): Promise<void> => {
  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.send(Buffer.from(await webResponse.arrayBuffer()));
};

export default async function falGenerateAdCopy(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await sendWebResponse(res, await falHandler(toWebRequest(req)));
}
