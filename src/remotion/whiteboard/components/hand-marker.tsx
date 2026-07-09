import { interpolate, useCurrentFrame } from "remotion";

interface HandMarkerProps {
  /** X coordinate of the marker tip (the point that touches the canvas). */
  x: number;
  /** Y coordinate of the marker tip. */
  y: number;
  /** Whether the hand is currently visible. */
  visible?: boolean;
  /**
   * URL to a PNG/WebP of a real hand holding a marker.
   *
   * The image should show a hand gripping a black marker with the marker tip
   * pointing left (the tip appears near the left/bottom-left of the image).
   * A transparent-background PNG works best for clean compositing.
   *
   * When omitted, a simplified SVG hand is used as a fallback.
   */
  src?: string;
  /**
   * Where the marker tip sits horizontally within the `src` image, as a
   * fraction of the image width (0 = left edge, 1 = right edge).
   * Default: 0.14 — typical for a hand-from-bottom-right holding a marker.
   */
  tipXRatio?: number;
  /**
   * Where the marker tip sits vertically within the `src` image, as a
   * fraction of the image height (0 = top, 1 = bottom).
   * Default: 0.78
   */
  tipYRatio?: number;
  /**
   * Overall size hint in pixels. When `src` is provided this scales the image
   * proportionally (assuming a roughly 1:1.4 width:height aspect ratio).
   * When using the SVG fallback it controls the hand height.
   */
  size?: number;
}

/**
 * Hand-holding-marker cursor placed at the current drawing tip.
 *
 * Drop-in replacement for the old geometric SVG hand: set `src` to a real
 * hand PNG and the hand image is positioned so its marker tip lands exactly
 * on `(x, y)`. Until you have an image, the improved SVG fallback renders.
 */
export const HandMarker = ({
  x,
  y,
  visible = true,
  src,
  tipXRatio = 0.14,
  tipYRatio = 0.78,
  size = 90,
}: HandMarkerProps) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 5], [0, visible ? 1 : 0], {
    extrapolateRight: "clamp",
  });

  if (!visible) {
    return null;
  }

  if (src) {
    // Real hand image — position so the marker tip aligns with (x, y)
    const imgWidth = size * 3.2;
    const imgHeight = size * 4.4;
    const imgX = x - imgWidth * tipXRatio;
    const imgY = y - imgHeight * tipYRatio;

    return (
      <image
        height={imgHeight}
        href={src}
        opacity={opacity}
        width={imgWidth}
        x={imgX}
        y={imgY}
      />
    );
  }

  // ─── SVG fallback ──────────────────────────────────────────────────────────
  // A simplified but legible hand from the lower-right holding a marker.
  // The group is translated so (0, 0) = marker tip.
  const s = size;
  return (
    <g opacity={opacity} transform={`translate(${x}, ${y})`}>
      {/* Marker tip */}
      <polygon fill="#1A1A1A" points={`-3,-2 3,-2 0,-${s * 0.1}`} />
      {/* Marker body */}
      <rect
        fill="#2A2A2A"
        height={s * 0.55}
        rx={s * 0.03}
        stroke="#111"
        strokeWidth={1}
        width={s * 0.12}
        x={-s * 0.06}
        y={-s * 0.62}
      />
      {/* Marker grip band */}
      <rect
        fill="#444"
        height={s * 0.07}
        width={s * 0.12}
        x={-s * 0.06}
        y={-s * 0.22}
      />
      {/* Palm */}
      <ellipse
        cx={s * 0.28}
        cy={-s * 0.02}
        fill="#F2C492"
        rx={s * 0.26}
        ry={s * 0.2}
        stroke="#D4955A"
        strokeWidth={1.2}
      />
      {/* Index finger holding marker */}
      <ellipse
        cx={s * 0.04}
        cy={-s * 0.28}
        fill="#F2C492"
        rx={s * 0.065}
        ry={s * 0.14}
        stroke="#D4955A"
        strokeWidth={1.2}
      />
      {/* Middle finger */}
      <ellipse
        cx={s * 0.18}
        cy={-s * 0.31}
        fill="#F2C492"
        rx={s * 0.065}
        ry={s * 0.13}
        stroke="#D4955A"
        strokeWidth={1.2}
      />
      {/* Ring finger */}
      <ellipse
        cx={s * 0.32}
        cy={-s * 0.28}
        fill="#F2C492"
        rx={s * 0.06}
        ry={s * 0.12}
        stroke="#D4955A"
        strokeWidth={1.2}
      />
      {/* Pinky */}
      <ellipse
        cx={s * 0.45}
        cy={-s * 0.22}
        fill="#F2C492"
        rx={s * 0.05}
        ry={s * 0.1}
        stroke="#D4955A"
        strokeWidth={1.2}
      />
      {/* Thumb */}
      <ellipse
        cx={s * 0.44}
        cy={s * 0.08}
        fill="#F2C492"
        rx={s * 0.07}
        ry={s * 0.12}
        stroke="#D4955A"
        strokeWidth={1.2}
        transform={`rotate(40, ${s * 0.44}, ${s * 0.08})`}
      />
    </g>
  );
};
