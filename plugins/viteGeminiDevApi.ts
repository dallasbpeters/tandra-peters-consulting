/**
 * Serves POST /api/gemini/generate-image during `vite` dev so Sanity Studio (separate origin)
 * can call Gemini without `vercel dev`. Requires GEMINI_API_KEY in repo-root `.env` / `.env.local`.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const GEMINI_PATH = "/api/gemini/generate-image";

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer | string) => {
      chunks.push(typeof c === "string" ? Buffer.from(c) : c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const sendOptions = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key",
  );
  res.statusCode = 204;
  res.end();
};

const pathnameOnly = (url: string | undefined) =>
  (url ?? "").split("?")[0] ?? "";

export const viteGeminiDevApi = (env: Record<string, string>): Plugin => ({
  name: "vite-gemini-dev-api",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== GEMINI_PATH) {
        next();
        return;
      }

      if (req.method === "OPTIONS") {
        sendOptions(res);
        return;
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      const key = env.GEMINI_API_KEY?.trim();
      if (key) {
        process.env.GEMINI_API_KEY = key;
      }
      if (env.GEMINI_PLUGIN_API_KEY?.trim()) {
        process.env.GEMINI_PLUGIN_API_KEY = env.GEMINI_PLUGIN_API_KEY.trim();
      }

      try {
        const { handler } =
          await import("sanity-plugin-gemini-ai-images-serverless");
        const host = req.headers.host ?? "localhost:3000";
        const pathWithQuery = req.url ?? GEMINI_PATH;
        const bodyBuf = await readBody(req);
        const bodyText =
          bodyBuf.length > 0 ? bodyBuf.toString("utf8") : undefined;

        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v == null) {
            continue;
          }
          if (Array.isArray(v)) {
            for (const x of v) {
              headers.append(k, x);
            }
          } else {
            headers.set(k, v);
          }
        }

        const webReq = new Request(`http://${host}${pathWithQuery}`, {
          method: "POST",
          headers,
          body: bodyText,
        });

        const webRes = await handler(webReq);
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          if (key.toLowerCase() === "content-encoding") {
            return;
          }
          try {
            res.setHeader(key, value);
          } catch {
            /* ignore invalid header names */
          }
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-API-Key",
        );
        const out = Buffer.from(await webRes.arrayBuffer());
        res.end(out);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify({ error: message }));
      }
    });
  },
});
