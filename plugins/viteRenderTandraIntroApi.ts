import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

import renderTandraIntro from "../api/render-tandra-intro.js";

const RENDER_PATH = "/api/render-tandra-intro";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const parseJson = (buffer: Buffer): Record<string, unknown> => {
  if (!buffer.length) {
    return {};
  }
  try {
    return JSON.parse(buffer.toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

/**
 * Dev-only middleware that mirrors the Remotion render endpoint under `pnpm dev`
 * so the Studio can render against the local site origin instead of relying on
 * the deployed `/api/render-tandra-intro` URL.
 */
export const viteRenderTandraIntroApi = (
  env: Record<string, string>
): Plugin => ({
  name: "vite-render-tandra-intro-api",
  configureServer(server) {
    for (const key of [
      "BLOB_READ_WRITE_TOKEN",
      "SANITY_WRITE_TOKEN",
      "SANITY_API_WRITE_TOKEN",
      "SANITY_API_READ_TOKEN",
      "VITE_SANITY_API_READ_TOKEN",
      "RENDER_VIDEO_SECRET",
    ]) {
      if (!process.env[key] && env[key]) {
        process.env[key] = env[key];
      }
    }

    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== RENDER_PATH) {
        next();
        return;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-force-render, x-render-secret"
      );

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      try {
        const body = parseJson(await readBody(req));
        const headers = {
          ...req.headers,
          ...(env.RENDER_VIDEO_SECRET
            ? {
                authorization: `Bearer ${env.RENDER_VIDEO_SECRET}`,
                "x-render-secret": env.RENDER_VIDEO_SECRET,
              }
            : {}),
        };
        const query = new URL(req.url ?? RENDER_PATH, "http://localhost")
          .searchParams;

        const devRes = {
          setHeader(name: string, value: string | number | readonly string[]) {
            res.setHeader(name, value);
            return devRes;
          },
          status(code: number) {
            res.statusCode = code;
            return devRes;
          },
          json(payload: unknown) {
            if (!res.getHeader("Content-Type")) {
              res.setHeader("Content-Type", "application/json");
            }
            res.end(JSON.stringify(payload));
            return devRes;
          },
          end(payload?: string) {
            res.end(payload);
            return devRes;
          },
        };

        await renderTandraIntro(
          {
            method: req.method,
            headers,
            query: Object.fromEntries(query.entries()),
            body,
          } as never,
          devRes as never
        );
      } catch (error) {
        console.error("[vite-render-tandra-intro-api]", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Unexpected render API error." }));
      }
    });
  },
});
