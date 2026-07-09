/**
 * Vite dev plugin — proxies POST /api/whiteboard/drawing to the Vercel
 * handler so the whiteboard drawing generation works during `pnpm dev`
 * without requiring `vercel dev`.
 */

import type { Plugin } from "vite";

const DRAWING_ENV_KEYS = ["GROQ_API_KEY"] as const;

export function viteWhiteboardDrawingApi(env: Record<string, string>): Plugin {
  return {
    name: "vite-whiteboard-drawing-api",
    configureServer(server) {
      // Forward keys that loadEnv resolves but process.env may not have
      for (const key of DRAWING_ENV_KEYS) {
        if (!process.env[key] && env[key]) {
          process.env[key] = env[key];
        }
      }

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || req.url !== "/api/whiteboard/drawing") {
          next();
          return;
        }

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", resolve);
            req.on("error", reject);
          });

          const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as {
            prompt?: string;
            sceneHint?: string;
          };

          const { generateDrawing } =
            await import("../api/lib/whiteboard-drawing-gen.js");
          const drawing = await generateDrawing(
            (body.prompt ?? "").trim(),
            body.sceneHint?.trim()
          );

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(drawing));
        } catch (error) {
          console.error("[vite-whiteboard-drawing-api]", error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Drawing generation failed" }));
        }
      });
    },
  };
}
