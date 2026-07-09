import { useEffect, useId, useRef, useState } from "react";
import {
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { allGlyphsCached, getCachedGlyph, loadGlyphs } from "../handfont-parse";
import type { ParsedGlyph } from "../handfont-parse";
import { HandfontLetter, glyphWidth } from "./handfont-letter";

type DominantBaseline =
  | "alphabetic"
  | "auto"
  | "central"
  | "hanging"
  | "ideographic"
  | "mathematical"
  | "middle"
  | "text-after-edge"
  | "text-before-edge";

export interface WriteTextProps {
  text: string;
  x?: number | string;
  y?: number | string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  textAnchor?: "start" | "middle" | "end";
  dominantBaseline?: DominantBaseline;
  /** Frame within current <Sequence> when writing starts. */
  startFrame?: number;
  /** Frames over which the entire text finishes drawing. */
  durationInFrames?: number;
  letterSpacing?: number;
  opacity?: number;
  /**
   * Scale factor for uppercase glyph height relative to `fontSize`.
   * Keeps baselines aligned so caps appear naturally taller than lowercase.
   * Default: 1.3
   */
  capsScale?: number;
}

// ---------------------------------------------------------------------------
// Character-width estimation
// ---------------------------------------------------------------------------

// Fraction of glyph height used as the gap between letters
const LETTER_GAP_RATIO = 0.04;
// Width of a space character as a fraction of glyph height
const SPACE_WIDTH_RATIO = 0.32;
// Default scale multiplier for uppercase glyphs relative to the nominal fontSize.
// Cap-height is typically ~1.3× x-height in hand-lettered styles.
const DEFAULT_CAPS_SCALE = 1.3;

const WIDE_PUNCT = new Set(["m", "w", "M", "W", "@", "%"]);
const NARROW_PUNCT = new Set([
  "i",
  "l",
  "I",
  "!",
  ".",
  ",",
  ";",
  ":",
  "|",
  "1",
]);

function estimateCharWidth(c: string, fontSize: number): number {
  if (c === " ") {
    return fontSize * SPACE_WIDTH_RATIO;
  }
  if (WIDE_PUNCT.has(c)) {
    return fontSize * 0.75;
  }
  if (NARROW_PUNCT.has(c)) {
    return fontSize * 0.22;
  }
  return fontSize * 0.55; // reasonable default for most punctuation/digits
}

// ---------------------------------------------------------------------------
// Row layout planning
// ---------------------------------------------------------------------------

interface CharToken {
  char: string;
  /** Glyph if the char is in the handfont library, null otherwise */
  glyph: ParsedGlyph | null;
  /** Rendered width in SVG coordinates */
  width: number;
  /** Rendered height (capsScale applied for uppercase glyphs) */
  height: number;
  /**
   * Y offset to apply so the glyph bottom (baseline) aligns with the row baseline.
   * Uppercase glyphs extend ABOVE rowY; this offset is negative.
   */
  yOffset: number;
  /** Is this an alphabetic character (counts toward animation timing) */
  isLetter: boolean;
}

function planRow(
  chars: string[],
  glyphs: Map<string, ParsedGlyph | null>,
  fontSize: number,
  capsScale: number
): CharToken[] {
  const gap = fontSize * LETTER_GAP_RATIO;
  return chars.map((c) => {
    if (c === " ") {
      return {
        char: c,
        glyph: null,
        width: fontSize * SPACE_WIDTH_RATIO + gap,
        height: fontSize,
        yOffset: 0,
        isLetter: false,
      };
    }
    const isUpper = c >= "A" && c <= "Z";
    const isLower = c >= "a" && c <= "z";
    const isLetter = isUpper || isLower;
    const g = glyphs.get(c) ?? null;
    // Uppercase glyphs are taller; keep baselines aligned by pushing y up.
    const h = isUpper ? fontSize * capsScale : fontSize;
    // Vertical offset so glyph bottom = rowY + fontSize (shared baseline).
    // yOffset is negative for uppercase (extends above the lowercase cap).
    const yOffset = isUpper ? -(h - fontSize) : 0;
    const w = g ? glyphWidth(g, h) : estimateCharWidth(c, fontSize);
    return { char: c, glyph: g, width: w + gap, height: h, yOffset, isLetter };
  });
}

// ---------------------------------------------------------------------------
// Y-offset for dominantBaseline
// ---------------------------------------------------------------------------

function topYFromBaseline(
  yNum: number,
  fontSize: number,
  dominantBaseline: DominantBaseline
): number {
  switch (dominantBaseline) {
    case "middle":
    case "central":
    case "mathematical": {
      return yNum - fontSize * 0.5;
    }
    case "hanging":
    case "text-before-edge": {
      return yNum;
    }
    default: {
      // alphabetic / auto: y = baseline; cap top ≈ 85% of fontSize above
      return yNum - fontSize * 0.85;
    }
  }
}

// ---------------------------------------------------------------------------
// Mixed handfont + SVG-text row
// ---------------------------------------------------------------------------

interface HandfontRowProps {
  tokens: CharToken[];
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  color: string;
  frame: number;
  startFrame: number;
  durationInFrames: number;
  opacity: number;
  rowX: number;
  rowY: number;
}

const HandfontRow = ({
  tokens,
  fontSize,
  fontFamily,
  fontWeight,
  color,
  frame,
  startFrame,
  durationInFrames,
  opacity,
  rowX,
  rowY,
}: HandfontRowProps) => {
  // Only letter characters drive the animation timeline
  const letterCount = tokens.filter((t) => t.isLetter).length || 1;
  const framesPerLetter = durationInFrames / letterCount;

  let cursorX = rowX;
  let letterIdx = 0;
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const { char, glyph, width, height, yOffset, isLetter } = token;

    if (char === " ") {
      cursorX += width;
      continue;
    }

    if (glyph && isLetter) {
      // Handfont animated letter
      const charStartFrame = startFrame + letterIdx * framesPerLetter;
      const progress = interpolate(
        frame,
        [charStartFrame, charStartFrame + framesPerLetter],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      elements.push(
        <HandfontLetter
          key={`${char}-${String(i)}`}
          color={color}
          glyph={glyph}
          height={height}
          progress={progress}
          x={cursorX}
          y={rowY + yOffset}
        />
      );
      letterIdx++;
    } else {
      // Fallback: SVG <text> for punctuation, digits, or unloaded glyphs
      const nearbyLetterStart = startFrame + letterIdx * framesPerLetter;
      const fallbackOpacity = interpolate(
        frame,
        [nearbyLetterStart - 2, nearbyLetterStart + 4],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      elements.push(
        <text
          key={`fallback-${String(i)}`}
          dominantBaseline="hanging"
          fill={color}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
          opacity={fallbackOpacity}
          x={cursorX}
          y={rowY}
        >
          {char}
        </text>
      );

      if (isLetter) {
        letterIdx++;
      }
    }

    cursorX += width;
  }

  return <g opacity={opacity}>{elements}</g>;
};

// ---------------------------------------------------------------------------
// WriteText — public component
// ---------------------------------------------------------------------------

/**
 * Renders text as a mix of animated hand-drawn glyphs (for A–Z / a–z) and
 * standard SVG <text> elements (for punctuation, digits, and unsupported chars).
 *
 * Falls back to the original full-width clip-path wipe when glyph loading fails.
 *
 * Animation types:
 *   Uppercase A–Z  →  stroke-dashoffset along the marker trajectory path
 *   Lowercase a–z  →  clip-rect wipe revealing the filled glyph outline
 *   Other chars    →  instant appearance timed to the surrounding letters
 */
export const WriteText = ({
  text,
  x = 0,
  y = 0,
  fontSize = 56,
  fontFamily = "Permanent Marker",
  fontWeight = 600,
  color = "#1C1C1C",
  textAnchor = "start",
  dominantBaseline = "auto",
  startFrame = 0,
  durationInFrames = 60,
  letterSpacing = 0,
  opacity = 1,
  capsScale = DEFAULT_CAPS_SCALE,
}: WriteTextProps) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const rawId = useId();
  const clipId = `wt${rawId.replaceAll(":", "")}`;

  const xNum = typeof x === "string" ? Number.parseFloat(x) : x;
  const yNum = typeof y === "string" ? Number.parseFloat(y) : y;

  // ── Handfont loading ────────────────────────────────────────────────────
  const [renderHandle] = useState(() => delayRender("Loading handfont glyphs"));
  // Guard: continueRender must be called exactly once per handle.
  const continuedRef = useRef(false);

  const [glyphs, setGlyphs] = useState<Map<string, ParsedGlyph | null> | null>(
    () => {
      if (allGlyphsCached(text)) {
        const map = new Map<string, ParsedGlyph | null>();
        for (const c of text) {
          if (c !== " ") {
            map.set(c, getCachedGlyph(c));
          }
        }
        return map;
      }
      return null;
    }
  );

  useEffect(() => {
    // Already resolved — do not call continueRender a second time.
    if (continuedRef.current) {
      return;
    }

    if (glyphs !== null) {
      continuedRef.current = true;
      continueRender(renderHandle);
      return;
    }

    // Load asynchronously; update state when done — the effect will re-run
    // with glyphs !== null and resolve the handle then.
    loadGlyphs(text).then(setGlyphs);

    // Release handle on unmount: prevents Remotion from reporting a
    // "delayRender was never resolved" error when the player seeks/pauses.
    return () => {
      if (!continuedRef.current) {
        continuedRef.current = true;
        continueRender(renderHandle);
      }
    };
  }, [renderHandle, glyphs, text]);

  // ── Wipe progress (fallback path only) ───────────────────────────────────
  const wipeProgress = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Handfont rendering ───────────────────────────────────────────────────
  if (glyphs !== null) {
    const chars = [...text];
    const tokens = planRow(chars, glyphs, fontSize, capsScale);
    const rowTotalWidth = tokens.reduce((acc, t) => acc + t.width, 0);

    const rowX =
      textAnchor === "middle"
        ? xNum - rowTotalWidth / 2
        : textAnchor === "end"
          ? xNum - rowTotalWidth
          : xNum;

    const rowY = topYFromBaseline(yNum, fontSize, dominantBaseline);

    return (
      <HandfontRow
        color={color}
        durationInFrames={durationInFrames}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        frame={frame}
        fontSize={fontSize}
        opacity={opacity}
        rowX={rowX}
        rowY={rowY}
        startFrame={startFrame}
        tokens={tokens}
      />
    );
  }

  // ── Fallback: clip-path wipe of SVG <text> ───────────────────────────────
  const clipTop = yNum - fontSize * 1.5;
  const clipHeight = fontSize * 2.5;
  const clipWidth = width * wipeProgress;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect height={clipHeight} width={clipWidth} x={0} y={clipTop} />
        </clipPath>
      </defs>
      <text
        clipPath={`url(#${clipId})`}
        dominantBaseline={dominantBaseline}
        fill={color}
        fontFamily={fontFamily}
        fontSize={fontSize}
        fontWeight={fontWeight}
        letterSpacing={letterSpacing}
        opacity={opacity}
        textAnchor={textAnchor}
        x={x}
        y={y}
      >
        {text}
      </text>
    </g>
  );
};
