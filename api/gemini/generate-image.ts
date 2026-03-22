/**
 * Vercel: POST /api/gemini/generate-image — Gemini image generation for Sanity Studio
 * (sanity-plugin-gemini-ai-images + sanity-plugin-gemini-ai-images-serverless).
 *
 * Env: GEMINI_API_KEY (required). Optional: GEMINI_PLUGIN_API_KEY — if set, clients must send X-API-Key.
 *
 * Local: run `vercel dev` from the repo root so this route is served; Vite alone does not host /api/*.
 */
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {handler as geminiHandler} from 'sanity-plugin-gemini-ai-images-serverless';

const addCors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key',
  );
};

const toWebRequest = (req: VercelRequest): Request => {
  const host = req.headers.host ?? 'localhost';
  const path = req.url?.startsWith('http') ? req.url : `https://${host}${req.url ?? '/'}`;
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
    req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'
      ? typeof req.body === 'string'
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
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key',
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
  if (req.method === 'OPTIONS') {
    addCors(res);
    res.status(204).end();
    return;
  }

  const webRes = await geminiHandler(toWebRequest(req));
  await sendWebResponse(res, webRes);
}
