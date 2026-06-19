import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(
  repoRoot,
  "node_modules",
  "@google",
  "model-viewer",
  "dist",
  "model-viewer.min.js"
);
const destDir = path.join(repoRoot, "public");
const dest = path.join(destDir, "model-viewer.min.js");

if (!existsSync(source)) {
  console.error(
    "[copy-model-viewer] Missing @google/model-viewer — run pnpm install."
  );
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);
console.log("[copy-model-viewer] public/model-viewer.min.js");
