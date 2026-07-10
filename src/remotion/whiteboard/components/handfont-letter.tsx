/**
 * Renders a single hand-drawn glyph as a pure JSX SVG.
 *
 * strokeDashoffset is set as a direct React prop on each <path> — no CSS
 * animations, no Web Animations API, no dangerouslySetInnerHTML.
 * This is the only approach that reliably works for SVG paths inside
 * clip-path compositing groups in Chrome.
 *
 * For letters with multiple stroke paths (e.g. B, E, F), each path animates
 * sequentially: path[i] draws during progress i/n → (i+1)/n.
 */

import { useId } from "react";

import type { ParsedGlyph } from "../handfont-parse";

// With pathLength={1} on every <path>, SVG normalises the path length to 1.
// So strokeDasharray={1} = one full dash; strokeDashoffset goes 1→0 (hidden→revealed).
// This gives a smooth, geometry-independent draw-on animation.
const DASH = 1;

interface HandfontLetterProps {
  glyph: ParsedGlyph;
  /** x position (left edge) in parent SVG coordinates. */
  x?: number;
  /** y position (top edge) in parent SVG coordinates. */
  y?: number;
  /** Rendered height in pixels; width derived from glyph aspect ratio. */
  height: number;
  /** Drawing progress 0 → 1. */
  progress: number;
  color?: string;
}

/** Rendered width of a glyph at the given height. */
export const glyphWidth = (glyph: ParsedGlyph, height: number): number =>
  (glyph.vw / glyph.vh) * height;

export const HandfontLetter = ({
  glyph,
  x = 0,
  y = 0,
  height,
  progress,
  color = "#1C1C1C",
}: HandfontLetterProps) => {
  const rawId = useId();
  // Strip React's `:r0:` colons — they are invalid in CSS id selectors.
  const clipId = `hfc${rawId.replaceAll(":", "")}`;

  const width = glyphWidth(glyph, height);
  const n = Math.max(1, glyph.strokePaths.length);

  return (
    // Nested <svg> maps the glyph's natural coordinate space (0 0 vw vh) to
    // the requested pixel width × height without needing explicit transforms.
    <svg
      aria-hidden="true"
      height={height}
      overflow="visible"
      viewBox={glyph.viewBox}
      width={width}
      x={x}
      y={y}
    >
      {glyph.clipPathD && (
        <defs>
          <clipPath id={clipId}>
            {/* The letter-outline mask keeps thick marker strokes inside the
                letter shape.  fill="none" here doesn't matter — SVG clipPath
                uses the geometric boundary, not the painted fill. */}
            <path d={glyph.clipPathD} />
          </clipPath>
        </defs>
      )}

      <g clipPath={glyph.clipPathD ? `url(#${clipId})` : undefined}>
        {glyph.strokePaths.map(({ d, strokeWidth }, i) => {
          // Divide the 0→1 progress range equally across strokes.
          const lo = i / n;
          const hi = (i + 1) / n;
          const local = Math.max(0, Math.min(1, (progress - lo) / (hi - lo)));
          const dashOffset = DASH * (1 - local);

          return (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: index is stable for a fixed set of glyph stroke paths
              key={i}
              d={d}
              fill="none"
              pathLength={1}
              stroke={color}
              strokeDasharray={DASH}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
              // Hide completely at local=0: strokeLinecap="round" leaves a tiny
              // visible cap dot at the stroke start even when dashOffset=1.
              visibility={local < 0.001 ? "hidden" : "visible"}
            />
          );
        })}
      </g>
    </svg>
  );
};
