import { HandMarker } from "./hand-marker";
import { HandVideo } from "./hand-video";

interface HandCursorProps {
  /** Canvas X of the marker tip. */
  x: number;
  /** Canvas Y of the marker tip. */
  y: number;
  visible?: boolean;
  /**
   * URL to the processed hand-marker.webm (VP9 + alpha).
   * Takes priority over `src` when both are provided.
   */
  videoSrc?: string;
  /** URL to a still hand PNG (used when no videoSrc). */
  src?: string;
  /** Marker tip X fraction within the asset (image or video). Default 0.20. */
  tipXRatio?: number;
  /** Marker tip Y fraction within the asset (image or video). Default 0.17. */
  tipYRatio?: number;
  /**
   * Display height for the video or image hand.
   * Ignored for the SVG fallback (use `size` instead).
   */
  displayHeight?: number;
  /** Size hint for the SVG fallback hand. Default 90. */
  size?: number;
}

/**
 * Unified hand-and-marker cursor for whiteboard scenes.
 *
 * Render priority:
 *   1. `videoSrc` → real VP9+alpha footage via `<HandVideo>`
 *   2. `src`      → still PNG image via `<HandMarker src>`
 *   3. fallback   → improved SVG hand via `<HandMarker>`
 *
 * All variants accept the same `x`/`y`/`visible` interface so scenes need
 * zero branching logic.
 */
export const HandCursor = ({
  x,
  y,
  visible = true,
  videoSrc,
  src,
  tipXRatio,
  tipYRatio,
  displayHeight,
  size = 90,
}: HandCursorProps) => {
  if (videoSrc) {
    return (
      <HandVideo
        displayHeight={displayHeight}
        src={videoSrc}
        tipXRatio={tipXRatio}
        tipYRatio={tipYRatio}
        visible={visible}
        x={x}
        y={y}
      />
    );
  }

  return (
    <HandMarker
      size={size}
      src={src}
      tipXRatio={tipXRatio}
      tipYRatio={tipYRatio}
      visible={visible}
      x={x}
      y={y}
    />
  );
};
