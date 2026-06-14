// ─────────────────────────────────────────────────────────────────────────────
// FadeWrapper.tsx
//
// Wraps any scene content with a fade-in at the start and a fade-out at the
// end. Drop this around any scene in MainVideo.tsx to get smooth transitions.
//
// How Remotion timing works inside a <Sequence>:
//   - useCurrentFrame() resets to 0 at the START of each Sequence.
//   - So frame 0 is always "the first frame of this scene", regardless of
//     where the scene sits in the overall timeline.
//   - durationInFrames is the total length of this particular scene.
//
// That's what makes the fade math straightforward: fade in over the first N
// frames, hold, fade out over the last N frames.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  /** Total frame count for this scene (same value you pass to <Sequence durationInFrames>). */
  durationInFrames: number;
  /** How many frames the fade-in lasts. Default: 15 (= 0.5 s at 30 fps). */
  fadeInFrames?: number;
  /** How many frames the fade-out lasts. Default: 15. */
  fadeOutFrames?: number;
  children: React.ReactNode;
}

export const FadeWrapper: React.FC<Props> = ({
  durationInFrames,
  fadeInFrames = 15,
  fadeOutFrames = 15,
  children,
}) => {
  const frame = useCurrentFrame();

  // interpolate maps the current frame to an opacity value.
  // The keyframe array must be strictly increasing.
  // We clamp so values never go below 0 or above 1.
  const opacity = interpolate(
    frame,
    [
      0, // start: fully transparent
      fadeInFrames, // end of fade-in: fully opaque
      durationInFrames - fadeOutFrames, // start of fade-out: still fully opaque
      durationInFrames, // end: fully transparent
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return <div style={{ width: "100%", height: "100%", opacity }}>{children}</div>;
};
