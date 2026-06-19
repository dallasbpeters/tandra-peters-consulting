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

const UPPER_CASE_RE = /[A-Z]/g;
const WHITESPACE_RE = /\s+/g;
const TRAILING_SEMICOLON_RE = /;$/u;

const toKebab = (key) =>
  key.replace(UPPER_CASE_RE, (m) => `-${m.toLowerCase()}`);

const normalizeCSSValue = (value) =>
  String(value)
    .replace(WHITESPACE_RE, " ")
    .trim()
    .replace(TRAILING_SEMICOLON_RE, "");

const tokenLines = (prefix, tokens) =>
  Object.entries(tokens).map(
    ([key, value]) =>
      `  --theme-${prefix}-${toKebab(key)}: ${normalizeCSSValue(value)};`
  );

const css = `/* Generated from src/theme.ts — do not edit; run pnpm generate:theme-css */
:root {
${tokenLines("radius", theme.radius).join("\n")}
${tokenLines("spacing", theme.spacing).join("\n")}
${tokenLines("shadow", theme.shadow).join("\n")}
}
`;

writeFileSync(outPath, css, "utf8");
console.log("[generate-theme-css] src/styles/theme-variables.css");
