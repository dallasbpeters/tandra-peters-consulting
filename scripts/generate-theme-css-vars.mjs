/**
 * Emit base CSS custom properties from src/theme.ts.
 * Scoped app variables live in the generated CSS file after the marker below
 * and are preserved when this script regenerates base tokens.
 * Output: src/styles/theme-variables.css
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { theme } from "../src/theme.ts";

const __dirname = import.meta.dirname;
const outPath = path.join(__dirname, "../src/styles/theme-variables.css");
const SCOPED_VARIABLES_MARKER = "/* Scoped app variables */";

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

const paletteLines = (palette) =>
  Object.entries(palette).flatMap(([scaleName, scale]) =>
    Object.entries(scale).map(
      ([step, value]) =>
        `  --theme-palette-${toKebab(scaleName)}-${step}: ${normalizeCSSValue(value)};`
    )
  );

const readScopedVariables = () => {
  if (!existsSync(outPath)) {
    return `${SCOPED_VARIABLES_MARKER}\n`;
  }

  const currentCss = readFileSync(outPath, "utf-8");
  const markerIndex = currentCss.indexOf(SCOPED_VARIABLES_MARKER);
  if (markerIndex === -1) {
    return `${SCOPED_VARIABLES_MARKER}\n`;
  }

  return currentCss.slice(markerIndex).trimEnd();
};

const css = `/* Generated from src/theme.ts — run pnpm generate:theme-css */
:root {
${tokenLines("color", theme.colors).join("\n")}
${paletteLines(theme.palette).join("\n")}
${tokenLines("radius", theme.radius).join("\n")}
${tokenLines("spacing", theme.spacing).join("\n")}
${tokenLines("shadow", theme.shadow).join("\n")}
}

${readScopedVariables()}
`;

writeFileSync(outPath, css, "utf-8");
console.log("[generate-theme-css] src/styles/theme-variables.css");
