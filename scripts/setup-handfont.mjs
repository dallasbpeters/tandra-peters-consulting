/**
 * Copies hand-drawn SVG font glyphs from src/handfont-svgs/ into
 * public/whiteboard/handfont/upper/ and public/whiteboard/handfont/lower/.
 *
 * Supported source naming conventions:
 *   Uppercase:  B-l.svg  → upper/B.svg
 *               G.svg    → upper/G.svg   (single letter, uppercase)
 *   Lowercase:  a.svg    → lower/a.svg
 *
 * Variants with digits (K1-l.svg, k1.svg, q1.svg) are skipped — use the
 * base letter file instead.
 */

import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = new URL("../src/handfont-svgs/", import.meta.url).pathname;
const destUpper = new URL(
  "../public/whiteboard/handfont/upper/",
  import.meta.url
).pathname;
const destLower = new URL(
  "../public/whiteboard/handfont/lower/",
  import.meta.url
).pathname;

mkdirSync(destUpper, { recursive: true });
mkdirSync(destLower, { recursive: true });

const files = readdirSync(src).filter((f) => f.endsWith(".svg"));

// Map: letter char → source filename (last write wins for duplicates)
const upperMap = new Map(); // 'A' → filename
const lowerMap = new Map(); // 'a' → filename

for (const file of files) {
  const base = file.replace(/\.svg$/, ""); // e.g. "B-l" or "A (2)" or "G"

  // Normalise: strip variant suffixes to get the raw letter
  //   "B-l"    → "B"    (explicit -l suffix)
  //   "X-U"    → "X"    (alternative suffix letter)
  //   "A (2)"  → "A"    (parenthetical copy number from macOS/Figma export)
  //   "G"      → "G"    (plain)
  const stripped = base
    .replace(/-[a-zA-Z]$/, "") // trailing "-l", "-U", etc.
    .replace(/\s*\(\d+\)$/, "") // trailing " (N)" or "(N)"
    .trim();

  // Skip when the BASE LETTER itself contains a digit (K1, k1 variants)
  if (/\d/.test(stripped)) {
    continue;
  }

  if (stripped.length !== 1) {
    continue;
  } // safety — ignore multi-char names

  const char = stripped;
  const isUpper = char >= "A" && char <= "Z";
  const isLower = char >= "a" && char <= "z";

  if (isUpper) {
    upperMap.set(char, file);
  } else if (isLower) {
    lowerMap.set(char, file);
  }
}

let copied = 0;

for (const [letter, file] of upperMap) {
  copyFileSync(join(src, file), join(destUpper, `${letter}.svg`));
  copied++;
}

for (const [letter, file] of lowerMap) {
  copyFileSync(join(src, file), join(destLower, `${letter}.svg`));
  copied++;
}

const missing = [];
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  if (!upperMap.has(c)) {
    missing.push(c);
  }
}
for (const c of "abcdefghijklmnopqrstuvwxyz") {
  if (!lowerMap.has(c)) {
    missing.push(c);
  }
}

console.log(
  `Copied ${copied} glyph SVG${copied === 1 ? "" : "s"} → upper/ and lower/ in public/whiteboard/handfont/`
);
if (missing.length > 0) {
  console.log(`Missing glyphs (will fall back to text): ${missing.join(", ")}`);
}
