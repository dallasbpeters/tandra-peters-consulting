/**
 * Serves POST /api/fal/generate-image during Vite dev so Sanity Studio can call
 * Fal without `vercel dev`. Requires FAL_KEY in repo-root .env.local.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const FAL_PATH = "/api/fal/generate-image";

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const sendOptions = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key"
  );
  res.statusCode = 204;
  res.end();
};

const pathnameOnly = (url: string | undefined) =>
  (url ?? "").split("?")[0] ?? "";

export const viteFalDevApi = (env: Record<string, string>): Plugin => ({
  name: "vite-fal-dev-api",
  configureServer(server) {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== FAL_PATH) {
        next();
        return;
      }

      if (req.method === "OPTIONS") {
        sendOptions(res);
        return;
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      if (env.FAL_KEY?.trim()) {
        process.env.FAL_KEY = env.FAL_KEY.trim();
      }

      try {
        const { handler } = await import("../api/lib/fal-generate-image.js");
        const host = req.headers.host ?? "localhost:3001";
        const pathWithQuery = req.url ?? FAL_PATH;
        const bodyBuf = await readBody(req);
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value == null) {
            continue;
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              headers.append(key, item);
            }
          } else {
            headers.set(key, value);
          }
        }

        const webReq = new Request(`http://${host}${pathWithQuery}`, {
          body: bodyBuf.length > 0 ? bodyBuf.toString("utf8") : undefined,
          headers,
          method: "POST",
        });

        const webRes = await handler(webReq);
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          if (key.toLowerCase() === "content-encoding") {
            return;
          }
          res.setHeader(key, value);
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-API-Key"
        );
        res.end(Buffer.from(await webRes.arrayBuffer()));
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : String(caught);
        res.statusCode = 500;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  },
});
