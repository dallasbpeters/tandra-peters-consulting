import { interpolate, OffthreadVideo, useCurrentFrame } from "remotion";

/** Native aspect ratio of the source hand-marker.webm footage. */
const VIDEO_ASPECT = 1584 / 1188;

interface HandVideoProps {
  /** Path to the processed hand-marker.webm (VP9 + alpha, black bg removed). */
  src: string;
  /** Canvas X coordinate the marker tip should start at (frame 0 of the video). */
  x: number;
  /** Canvas Y coordinate the marker tip should start at (frame 0 of the video). */
  y: number;
  /** Whether the hand is currently visible. */
  visible?: boolean;
  /**
   * Display height in pixels on the canvas.
   * Width is derived from the video's native 4:3 aspect ratio.
   * Default: 580px — large enough to be clearly visible on 1080p without
   * overwhelming the content.
   */
  displayHeight?: number;
  /**
   * Horizontal fraction of the video frame where the marker tip sits at t=0.
   * Calibrated from the source footage: tip appears ~20% from the left edge.
   */
  tipXRatio?: number;
  /**
   * Vertical fraction of the video frame where the marker tip sits at t=0.
   * Calibrated from the source footage: tip appears ~17% from the top edge.
   */
  tipYRatio?: number;
}

/**
 * Composites the real hand-and-marker footage over the whiteboard canvas.
 *
 * The video is VP9+alpha (black background keyed out in preprocessing), so it
 * composites cleanly over any background color without CSS blend modes.
 *
 * The component positions the `<div>` wrapper each frame so the marker tip
 * tracks the `(x, y)` coordinate passed in — typically the leading edge of the
 * text wipe in the active scene. Combined with the natural hand motion baked
 * into the footage, this creates a convincing drawing illusion.
 *
 * Usage: drop in wherever `<HandMarker>` is used; same `x`/`y`/`visible` API.
 */
export const HandVideo = ({
  src,
  x,
  y,
  visible = true,
  displayHeight = 580,
  tipXRatio = 0.2,
  tipYRatio = 0.17,
}: HandVideoProps) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (!visible) {
    return null;
  }

  const displayWidth = displayHeight * VIDEO_ASPECT;

  // Shift the video div so the marker tip (at tipXRatio, tipYRatio within
  // the video frame) lands exactly at the target canvas position.
  const left = x - displayWidth * tipXRatio;
  const top = y - displayHeight * tipYRatio;

  return (
    <div
      style={{
        height: displayHeight,
        left,
        opacity,
        pointerEvents: "none",
        position: "absolute",
        top,
        width: displayWidth,
      }}
    >
      <OffthreadVideo
        src={src}
        style={{ height: "100%", objectFit: "fill", width: "100%" }}
      />
    </div>
  );
};
