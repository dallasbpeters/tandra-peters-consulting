/**
 * Emit CSS custom properties from src/theme.ts (single source of truth).
 * Output: src/styles/theme-variables.css
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { theme } from "../src/theme.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/styles/theme-variables.css");

const toKebab = (key) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const tokenLines = (prefix, tokens) =>
  Object.entries(tokens).map(([key, value]) => `  --theme-${prefix}-${toKebab(key)}: ${value};`);

const css = `/* Generated from src/theme.ts — do not edit; run pnpm generate:theme-css */
:root {
${tokenLines("radius", theme.radius).join("\n")}
${tokenLines("spacing", theme.spacing).join("\n")}
}
`;

writeFileSync(outPath, `${css}\n`, "utf8");
console.log("[generate-theme-css] src/styles/theme-variables.css");
