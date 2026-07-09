/**
 * Vite dev-only plugin: glyph editor file I/O.
 *
 * Endpoints:
 *   GET  /api/glyph-editor/svg?char=A
 *     → serves public/whiteboard/handfont/{upper|lower}/{char}.svg
 *
 *   POST /api/glyph-editor/save
 *     body: JSON { char: string, svg: string }
 *     → writes to public/whiteboard/handfont/{sub}/{char}.svg  (immediate effect)
 *        also writes to src/handfont-svgs/{char}.svg          (source of truth)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Plugin } from "vite";

const ROOT = process.cwd();

function glyphPaths(char: string) {
  const sub = char >= "A" && char <= "Z" ? "upper" : "lower";
  const pubPath = join(ROOT, "public/whiteboard/handfont", sub, `${char}.svg`);
  const srcPath = join(ROOT, "src/handfont-svgs", `${char}.svg`);
  return { pubPath, srcPath };
}

export function viteGlyphEditorApi(): Plugin {
  return {
    apply: "serve",
    name: "vite-glyph-editor-api",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? "";
        const url = new URL(raw, "http://localhost");

        // ── GET /api/glyph-editor/svg?char=X ──────────────────────────────
        if (req.method === "GET" && url.pathname === "/api/glyph-editor/svg") {
          const char = url.searchParams.get("char") ?? "";
          if (char.length !== 1) {
            res.statusCode = 400;
            res.end("bad char");
            return;
          }
          const { pubPath } = glyphPaths(char);
          if (!existsSync(pubPath)) {
            res.statusCode = 404;
            res.end("glyph not found");
            return;
          }
          res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(readFileSync(pubPath, "utf-8"));
          return;
        }

        // ── POST /api/glyph-editor/save ────────────────────────────────────
        if (
          req.method === "POST" &&
          url.pathname === "/api/glyph-editor/save"
        ) {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body) as { char: string; svg: string };
              const { char, svg } = parsed;

              if (!char || char.length !== 1 || typeof svg !== "string") {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({ ok: false, error: "invalid payload" })
                );
                return;
              }

              const { pubPath, srcPath } = glyphPaths(char);

              // Always write to public/ (immediate browser effect)
              writeFileSync(pubPath, svg, "utf-8");

              // Write back to src/handfont-svgs/ if the source file exists
              const srcWritten = existsSync(srcPath);
              if (srcWritten) {
                writeFileSync(srcPath, svg, "utf-8");
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, srcWritten }));
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(error) }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
