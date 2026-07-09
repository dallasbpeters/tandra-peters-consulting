/**
 * Browser-side SVG parser for hand-drawn font glyphs.
 *
 * SVG format (Affinity Designer / Illustrator export):
 *
 *   <svg viewBox="0 0 W H">
 *     <defs>
 *       <style>
 *         .f, .g { fill: none; }
 *         .g { stroke: #000; stroke-width: Npx; stroke-linecap: round; ... }
 *         .h { clip-path: url(#e); }
 *       </style>
 *       <clipPath id="e">
 *         <path class="f" d="…" />   ← letter-outline mask
 *       </clipPath>
 *     </defs>
 *     <g …>
 *       <g …>
 *         <path d="…" />             ← optional filled body (uppercase only)
 *         <g class="h">              ← clip group
 *           <path class="g" d="…" />  ← drawing trajectory (1 or more)
 *           <path class="g" d="…" />
 *         </g>
 *       </g>
 *     </g>
 *   </svg>
 *
 * We extract:
 *  - viewBox dimensions
 *  - clipPathD  — the outline mask path (for a <clipPath> in JSX)
 *  - strokePaths — each drawing trajectory {d, strokeWidth}
 *
 * Then handfont-letter.tsx renders pure JSX SVG with strokeDashoffset set as a
 * React prop each frame — no CSS animations, no dangerouslySetInnerHTML.
 */

export interface StrokePath {
  d: string;
  strokeWidth: number;
}

export interface ParsedGlyph {
  /** viewBox string, e.g. "0 0 58.42 80.33" */
  viewBox: string;
  vw: number;
  vh: number;
  /** Path d attribute for the letter-outline clip mask. */
  clipPathD: string;
  /** One or more drawing-trajectory stroke paths. */
  strokePaths: StrokePath[];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parseGlyph(svgText: string): ParsedGlyph | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    return null;
  }

  const svg = doc.querySelector("svg");
  if (!svg) {
    return null;
  }

  const viewBox = svg.getAttribute("viewBox") ?? "0 0 100 100";
  const parts = viewBox.split(/[\s,]+/).map(Number);
  if (parts.length < 4) {
    return null;
  }
  const [_x, _y, vw, vh] = parts;

  // Clip-path outline: <clipPath><path class="f" …/></clipPath>
  const clipEl = svg.querySelector("clipPath path");
  const clipPathD = clipEl?.getAttribute("d") ?? "";
  if (!clipPathD) {
    return null;
  }

  // Read stroke-width from embedded <style>
  const styleText = svg.querySelector("style")?.textContent ?? "";
  const swMatch = /stroke-width\s*:\s*([\d.]+)px/.exec(styleText);
  const defaultStrokeWidth = swMatch ? Number.parseFloat(swMatch[1]) : 19;

  // All drawing-trajectory paths (<path class="g">)
  const gPaths = [...svg.querySelectorAll("path.g")] as SVGPathElement[];
  if (gPaths.length === 0) {
    return null;
  }

  const strokePaths: StrokePath[] = gPaths.map((p) => {
    const d = p.getAttribute("d") ?? "";
    // Individual paths may override stroke-width inline
    const inlineStyle = p.getAttribute("style") ?? "";
    const swInline = /stroke-width\s*:\s*([\d.]+)px/.exec(inlineStyle);
    const strokeWidth = swInline
      ? Number.parseFloat(swInline[1])
      : defaultStrokeWidth;
    return { d, strokeWidth };
  });

  return { viewBox, vw, vh, clipPathD, strokePaths };
}

// ---------------------------------------------------------------------------
// Loader — module-level cache
// ---------------------------------------------------------------------------

const glyphCache = new Map<string, ParsedGlyph | null>();
const pendingFetches = new Map<string, Promise<ParsedGlyph | null>>();

function glyphUrl(char: string): string {
  const sub = char >= "A" && char <= "Z" ? "upper" : "lower";
  return `/whiteboard/handfont/${sub}/${char}.svg`;
}

export async function loadGlyph(char: string): Promise<ParsedGlyph | null> {
  if (glyphCache.has(char)) {
    return glyphCache.get(char) ?? null;
  }
  const existing = pendingFetches.get(char);
  if (existing) {
    return existing;
  }

  const isAlpha = (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
  if (!isAlpha) {
    glyphCache.set(char, null);
    return null;
  }

  const promise = fetch(glyphUrl(char))
    .then(async (res) => {
      if (!res.ok) {
        return null;
      }
      const text = await res.text();
      const glyph = parseGlyph(text);
      glyphCache.set(char, glyph);
      return glyph;
    })
    .catch(() => {
      glyphCache.set(char, null);
      return null;
    });

  pendingFetches.set(char, promise);
  return promise;
}

export async function loadGlyphs(
  text: string
): Promise<Map<string, ParsedGlyph | null>> {
  const chars = [...new Set(text)].filter((c) => c !== " ");
  await Promise.all(chars.map(loadGlyph));
  const result = new Map<string, ParsedGlyph | null>();
  for (const c of chars) {
    result.set(c, glyphCache.get(c) ?? null);
  }
  return result;
}

export function allGlyphsCached(text: string): boolean {
  for (const c of text) {
    if (c === " ") {
      continue;
    }
    if (!glyphCache.has(c)) {
      return false;
    }
  }
  return true;
}

export function getCachedGlyph(char: string): ParsedGlyph | null {
  return glyphCache.get(char) ?? null;
}
