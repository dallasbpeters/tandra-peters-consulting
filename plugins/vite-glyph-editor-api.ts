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
 *
 *   POST /api/glyph-editor/upload
 *     body: JSON { char: string, svg: string }
 *     → same as /save but always creates the src/handfont-svgs/ file even if
 *        it didn't exist yet (replaces whatever was there).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Plugin } from "vite";

const ROOT = process.cwd();

function glyphPaths(char: string) {
  const sub = char >= "A" && char <= "Z" ? "upper" : "lower";
  const pubPath = join(ROOT, "public/whiteboard/handfont", sub, `${char}.svg`);
  // Canonical source name — always char.svg regardless of the original export naming
  const srcPath = join(ROOT, "src/handfont-svgs", `${char}.svg`);
  return { pubPath, srcPath, sub };
}

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function writeGlyph(char: string, svg: string, alwaysSrc: boolean) {
  const { pubPath, srcPath, sub } = glyphPaths(char);

  // Ensure directories exist
  mkdirSync(join(ROOT, "public/whiteboard/handfont", sub), { recursive: true });
  mkdirSync(join(ROOT, "src/handfont-svgs"), { recursive: true });

  // Always write to public/ — immediate browser effect
  writeFileSync(pubPath, svg, "utf-8");

  // Write to src/handfont-svgs/ — always for uploads, only if already exists for saves
  if (alwaysSrc) {
    writeFileSync(srcPath, svg, "utf-8");
    return true;
  }

  try {
    readFileSync(srcPath);
    writeFileSync(srcPath, svg, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function viteGlyphEditorApi(): Plugin {
  return {
    apply: "serve",
    name: "vite-glyph-editor-api",

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
          try {
            const svg = readFileSync(pubPath, "utf-8");
            res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(svg);
          } catch {
            res.statusCode = 404;
            res.end("glyph not found");
          }
          return;
        }

        // ── POST /api/glyph-editor/save  (adjustments from the editor) ────
        // ── POST /api/glyph-editor/upload (new SVG file drop) ─────────────
        const isSave =
          req.method === "POST" && url.pathname === "/api/glyph-editor/save";
        const isUpload =
          req.method === "POST" && url.pathname === "/api/glyph-editor/upload";

        if (isSave || isUpload) {
          try {
            const body = await readBody(req);
            const parsed = JSON.parse(body) as { char: string; svg: string };
            const { char, svg } = parsed;

            if (!char || char.length !== 1 || typeof svg !== "string") {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: "invalid payload" }));
              return;
            }

            const srcWritten = writeGlyph(char, svg, isUpload);

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, srcWritten }));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(error) }));
          }
          return;
        }

        next();
      });
    },
  };
}
