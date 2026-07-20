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

/** Tight axis-aligned bounding box of a glyph's stroke paths in SVG user units. */
export interface TightBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Path bounding-box helper (supports all SVG path commands)
// ---------------------------------------------------------------------------

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Compute the bounding box of a single SVG path `d` string.
 * For Bézier curves this uses the convex-hull of control points — a valid
 * (slightly conservative) bound that is more than accurate enough for glyph
 * sizing.  Returns null for empty or unparseable paths.
 */
function pathBbox(d: string): BBox | null {
  // Tokenise into command letters and numeric strings
  const tokens = d.match(
    /[MLHVCSQTAZmlhvcsqtaz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
  );
  if (!tokens) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let cx = 0;
  let cy = 0;
  let cmd = "M";
  let nums: number[] = [];

  const addPt = (px: number, py: number) => {
    if (px < minX) {
      minX = px;
    }
    if (px > maxX) {
      maxX = px;
    }
    if (py < minY) {
      minY = py;
    }
    if (py > maxY) {
      maxY = py;
    }
  };

  const flush = () => {
    const n = nums;
    nums = [];
    switch (cmd) {
      // Absolute moveto / lineto — identical coordinate handling
      case "M":
      case "L":
      case "T": {
        for (let i = 0; i + 1 < n.length; i += 2) {
          cx = n[i];
          cy = n[i + 1];
          addPt(cx, cy);
        }
        break;
      }
      // Relative moveto / lineto / smooth quadratic
      case "m":
      case "l":
      case "t": {
        for (let i = 0; i + 1 < n.length; i += 2) {
          cx += n[i];
          cy += n[i + 1];
          addPt(cx, cy);
        }
        break;
      }
      case "H": {
        for (const v of n) {
          cx = v;
          addPt(cx, cy);
        }
        break;
      }
      case "h": {
        for (const v of n) {
          cx += v;
          addPt(cx, cy);
        }
        break;
      }
      case "V": {
        for (const v of n) {
          cy = v;
          addPt(cx, cy);
        }
        break;
      }
      case "v": {
        for (const v of n) {
          cy += v;
          addPt(cx, cy);
        }
        break;
      }
      // Cubic Bézier — bound via control points
      case "C": {
        for (let i = 0; i + 5 < n.length; i += 6) {
          addPt(n[i], n[i + 1]);
          addPt(n[i + 2], n[i + 3]);
          cx = n[i + 4];
          cy = n[i + 5];
          addPt(cx, cy);
        }
        break;
      }
      case "c": {
        for (let i = 0; i + 5 < n.length; i += 6) {
          addPt(cx + n[i], cy + n[i + 1]);
          addPt(cx + n[i + 2], cy + n[i + 3]);
          cx += n[i + 4];
          cy += n[i + 5];
          addPt(cx, cy);
        }
        break;
      }
      // Smooth cubic / quadratic — bound via control point + endpoint
      case "S":
      case "Q": {
        for (let i = 0; i + 3 < n.length; i += 4) {
          addPt(n[i], n[i + 1]);
          cx = n[i + 2];
          cy = n[i + 3];
          addPt(cx, cy);
        }
        break;
      }
      case "s":
      case "q": {
        for (let i = 0; i + 3 < n.length; i += 4) {
          addPt(cx + n[i], cy + n[i + 1]);
          cx += n[i + 2];
          cy += n[i + 3];
          addPt(cx, cy);
        }
        break;
      }
      // Arc — approximate with endpoint only
      case "A": {
        for (let i = 0; i + 6 < n.length; i += 7) {
          cx = n[i + 5];
          cy = n[i + 6];
          addPt(cx, cy);
        }
        break;
      }
      case "a": {
        for (let i = 0; i + 6 < n.length; i += 7) {
          cx += n[i + 5];
          cy += n[i + 6];
          addPt(cx, cy);
        }
        break;
      }
      // Z/z — closepath, no coordinates; all other unknown commands: no-op
      default: {
        break;
      }
    }
  };

  for (const tok of tokens) {
    if (/^[MLHVCSQTAZmlhvcsqtaz]$/.test(tok)) {
      flush();
      cmd = tok;
    } else {
      const v = Number.parseFloat(tok);
      if (!Number.isNaN(v)) {
        nums.push(v);
      }
    }
  }
  flush();

  if (!Number.isFinite(minX)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

/** Merge two BBox objects into their union. */
function mergeBbox(a: BBox, b: BBox): BBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Compute a tight bounding box across all stroke paths of a glyph. */
function computeTightBounds(paths: StrokePath[]): TightBounds | undefined {
  let box: BBox | null = null;
  let maxSw = 0;
  for (const sp of paths) {
    const b = pathBbox(sp.d);
    if (b) {
      box = box ? mergeBbox(box, b) : b;
    }
    if (sp.strokeWidth > maxSw) {
      maxSw = sp.strokeWidth;
    }
  }
  if (!box) {
    return undefined;
  }
  // Pad by half the stroke width so the marker edge isn't clipped.
  const pad = maxSw / 2;
  return {
    x: box.minX - pad,
    y: box.minY - pad,
    w: box.maxX - box.minX + pad * 2,
    h: box.maxY - box.minY + pad * 2,
  };
}

export interface ParsedGlyph {
  /** viewBox string, e.g. "0 0 58.42 80.33" */
  viewBox: string;
  vw: number;
  vh: number;
  /**
   * Path d attribute for the letter-outline clip mask.
   * Optional — simple SVG exports (no <clipPath>) render without clipping.
   */
  clipPathD?: string;
  /** One or more drawing-trajectory stroke paths. */
  strokePaths: StrokePath[];
  /**
   * Tight bounding box of the actual strokes (padded by ½ stroke-width).
   * When present, HandfontLetter uses this as the viewBox so the letter
   * fills its allocated height regardless of SVG export padding.
   */
  tightBounds?: TightBounds;
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

  // Clip-path outline: <clipPath><path …/></clipPath>
  // Optional — many simple SVG exports don't include an outline mask.
  const clipEl = svg.querySelector("clipPath path");
  const clipPathD = clipEl?.getAttribute("d") ?? undefined;

  // Read stroke-width from embedded <style>.
  // Collect ALL per-class stroke-widths so each class maps to its own width.
  // Accept values with or without "px" units (different exporters vary).
  const styleText = svg.querySelector("style")?.textContent ?? "";
  const classSwMap = new Map<string, number>();
  for (const m of styleText.matchAll(
    /\.(\w+)[^{]*\{[^}]*stroke-width\s*:\s*([\d.]+)/g
  )) {
    classSwMap.set(m[1], Number.parseFloat(m[2]));
  }
  // Fallback when no per-class info is found
  const defaultStrokeWidth =
    classSwMap.size > 0 ? (classSwMap.values().next().value ?? 19) : 19;

  // ---------------------------------------------------------------------------
  // Collect stroke elements: <path>, <polyline>, <line> — any class that has
  // a stroke in the embedded CSS or an inline stroke style.
  // ---------------------------------------------------------------------------

  /** Convert a polyline / polygon `points` attribute to an SVG path `d`. */
  function pointsToD(points: string): string {
    const nums = points
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const cmds: string[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      cmds.push(`${i === 0 ? "M" : "L"}${nums[i]},${nums[i + 1]}`);
    }
    return cmds.join(" ");
  }

  /** Convert a `<line>` element to an SVG path `d`. */
  function lineToD(el: Element): string {
    const x1 = el.getAttribute("x1") ?? "0";
    const y1 = el.getAttribute("y1") ?? "0";
    const x2 = el.getAttribute("x2") ?? "0";
    const y2 = el.getAttribute("y2") ?? "0";
    return `M${x1},${y1} L${x2},${y2}`;
  }

  /** Resolve stroke-width for an element: inline style → attribute → class map → default. */
  function resolveStrokeWidth(el: Element): number {
    const inlineStyle = el.getAttribute("style") ?? "";
    const m = /stroke-width\s*:\s*([\d.]+)/.exec(inlineStyle);
    if (m) {
      return Number.parseFloat(m[1]);
    }
    const swAttr = el.getAttribute("stroke-width");
    if (swAttr) {
      const n = Number.parseFloat(swAttr);
      if (Number.isFinite(n)) {
        return n;
      }
    }
    for (const cls of el.classList) {
      if (classSwMap.has(cls)) {
        return classSwMap.get(cls) as number;
      }
    }
    return defaultStrokeWidth;
  }

  /**
   * Is an element inside a <defs> or <clipPath>?
   * We exclude those from stroke candidates — they are masks, not glyphs.
   */
  function isInDefs(el: Element): boolean {
    let cur: Element | null = el.parentElement;
    while (cur && cur !== svg) {
      if (cur.tagName === "defs" || cur.tagName === "clipPath") {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }

  // Strategy 1: class-based (the original Affinity Designer / our handfont export format)
  const strokeEls: Element[] = [
    ...svg.querySelectorAll("path.g, polyline.g, line.g"),
    // Also include elements with any other stroke class referenced in the CSS
    ...[...classSwMap.keys()]
      .filter((cls) => cls !== "f") // skip fill-only / clip classes
      .flatMap((cls) => [
        ...svg.querySelectorAll(`path.${cls}, polyline.${cls}, line.${cls}`),
      ]),
  ];

  // De-duplicate (same element may appear via multiple selectors)
  const seen = new Set<Element>();
  const unique = strokeEls.filter((el) => {
    if (seen.has(el)) {
      return false;
    }
    seen.add(el);
    return true;
  });

  // Strategy 2: fallback for SVGs that use direct stroke attributes instead of
  // class-based CSS (e.g. Procreate exports, simple Illustrator paths).
  // Grab any path/polyline/line outside <defs>/<clipPath> that has a visible
  // stroke — either via a `stroke` attribute, `fill="none"`, or no fill at all.
  if (unique.length === 0) {
    for (const el of svg.querySelectorAll("path, polyline, line")) {
      if (isInDefs(el)) {
        continue;
      }
      const hasStrokeAttr = el.hasAttribute("stroke");
      const fillAttr = el.getAttribute("fill");
      // Include if it explicitly strokes, or has no fill (likely stroke-only)
      if (
        (hasStrokeAttr || fillAttr === "none" || fillAttr === null) &&
        !seen.has(el)
      ) {
        seen.add(el);
        unique.push(el);
      }
    }
  }

  if (unique.length === 0) {
    return null;
  }

  const strokePaths: StrokePath[] = unique
    .map((el) => {
      let d: string;
      if (el.tagName === "polyline" || el.tagName === "polygon") {
        d = pointsToD(el.getAttribute("points") ?? "");
      } else if (el.tagName === "line") {
        d = lineToD(el);
      } else {
        d = el.getAttribute("d") ?? "";
      }
      return { d, strokeWidth: resolveStrokeWidth(el) };
    })
    .filter((sp) => sp.d.length > 0);

  // If the glyph editor has previously saved explicit tight-bounds via
  // data-tight-* attributes, honour them so the user's viewport edits survive
  // the round-trip through parseGlyph (which would otherwise recompute bounds
  // from raw path geometry and throw away any saved changes).
  const dtx = svg.dataset.tightX;
  const dty = svg.dataset.tightY;
  const dtw = svg.dataset.tightW;
  const dth = svg.dataset.tightH;
  const tightBounds =
    dtx != null && dty != null && dtw != null && dth != null
      ? {
          x: Number.parseFloat(dtx),
          y: Number.parseFloat(dty),
          w: Number.parseFloat(dtw),
          h: Number.parseFloat(dth),
        }
      : computeTightBounds(strokePaths);

  return { viewBox, vw, vh, clipPathD, strokePaths, tightBounds };
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
