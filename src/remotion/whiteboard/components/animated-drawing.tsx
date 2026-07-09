/**
 * AnimatedDrawing — renders an ordered array of SVG stroke paths and
 * progressively "draws" them on screen using stroke-dashoffset + pathLength={1}.
 *
 * Uses the same frame-driven API as DrawPath:
 *   - startFrame / durationInFrames control the overall timeline
 *   - paths animate sequentially, each occupying an equal time slice
 *
 * Drawings are the primary visual for a whiteboard scene. Text is secondary.
 */

import { useId } from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface AnimatedDrawingProps {
  /** Ordered stroke paths (SVG `d` attributes). */
  paths: string[];
  /** SVG viewBox, e.g. "0 0 300 300". */
  viewBox?: string;
  /** Frame within current <Sequence> when drawing starts. */
  startFrame?: number;
  /** Frames over which ALL paths are drawn (distributed equally). */
  durationInFrames?: number;
  /** Position in parent SVG. */
  x?: number;
  y?: number;
  /** Rendered size in parent SVG user units. Drawing scales uniformly to fit. */
  width?: number;
  height?: number;
  /** Marker stroke color. */
  color?: string;
  /** Stroke width in viewBox units. */
  strokeWidth?: number;
}

export const AnimatedDrawing = ({
  paths,
  viewBox = "0 0 300 300",
  startFrame = 0,
  durationInFrames = 120,
  x = 0,
  y = 0,
  width = 300,
  height = 300,
  color = "#1C1C1C",
  strokeWidth = 6,
}: AnimatedDrawingProps) => {
  const frame = useCurrentFrame();
  const rawId = useId();
  const uid = `adrw${rawId.replaceAll(":", "")}`;

  const n = Math.max(1, paths.length);

  // Overall 0→1 progress across all paths
  const totalProgress = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg
      aria-hidden="true"
      height={height}
      overflow="visible"
      viewBox={viewBox}
      width={width}
      x={x}
      y={y}
    >
      {paths.map((d, i) => {
        // Each path occupies its equal slice of total progress.
        const lo = i / n;
        const hi = (i + 1) / n;
        const local = Math.max(
          0,
          Math.min(1, (totalProgress - lo) / (hi - lo))
        );

        return (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: stable index for fixed path list
            key={`${uid}-${i}`}
            d={d}
            fill="none"
            pathLength={1}
            stroke={color}
            strokeDasharray={1}
            strokeDashoffset={1 - local}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        );
      })}
    </svg>
  );
};

/**
 * Returns the (x, y) tip position of the marker at a given frame,
 * computed from the path data and overall drawing timeline.
 * Used by scene components to position the HandCursor over the drawing.
 */
export function drawingHandPos(
  paths: string[],
  viewBox: string,
  startFrame: number,
  durationInFrames: number,
  frame: number,
  destX: number,
  destY: number,
  destW: number,
  destH: number
): { x: number; y: number } {
  const parts = viewBox.split(" ").map(Number);
  const [vx, vy, vw, vh] = parts.length === 4 ? parts : [0, 0, 300, 300];

  const n = Math.max(1, paths.length);
  const totalProgress = Math.max(
    0,
    Math.min(1, (frame - startFrame) / Math.max(1, durationInFrames))
  );

  // Which path are we on?
  const pathIdx = Math.min(Math.floor(totalProgress * n), n - 1);
  const lo = pathIdx / n;
  const hi = (pathIdx + 1) / n;
  const local = Math.max(0, Math.min(1, (totalProgress - lo) / (hi - lo)));

  const dStr = paths[pathIdx];
  if (!dStr) {
    return { x: destX + destW / 2, y: destY + destH / 2 };
  }

  // Approximate tip as a point along the path using the progress fraction.
  // We can't call getPointAtLength in Remotion (server-side), so we sample
  // the path's coordinates from the d-attribute string directly.
  const tip = approximatePointOnPath(dStr, local);

  // Map from viewBox space to destination rect space
  const scaleX = destW / Math.max(1, vw);
  const scaleY = destH / Math.max(1, vh);
  return {
    x: destX + (tip.x - vx) * scaleX,
    y: destY + (tip.y - vy) * scaleY,
  };
}

/**
 * Very lightweight path sampler that extracts the first and last explicit
 * coordinate pairs and lerps between them based on `t`.
 * Good enough for hand cursor positioning; not a true arc-length parameterization.
 */
function approximatePointOnPath(
  d: string,
  t: number
): { x: number; y: number } {
  // Match all number pairs that could be coordinates
  const coords = [...d.matchAll(/([-\d.]+)\s*,\s*([-\d.]+)/g)].map((m) => ({
    x: Number.parseFloat(m[1]),
    y: Number.parseFloat(m[2]),
  }));

  if (coords.length === 0) {
    return { x: 150, y: 150 };
  }
  if (coords.length === 1) {
    return coords[0];
  }

  const idx = t * (coords.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, coords.length - 1);
  const frac = idx - lo;

  return {
    x: coords[lo].x + (coords[hi].x - coords[lo].x) * frac,
    y: coords[lo].y + (coords[hi].y - coords[lo].y) * frac,
  };
}
