import { interpolate, useCurrentFrame } from "remotion";

interface DrawPathProps {
  /** SVG path `d` attribute. */
  d: string;
  color?: string;
  /** Frame within current <Sequence> when drawing starts. */
  startFrame?: number;
  /** Frames over which the path is drawn. */
  durationInFrames?: number;
  strokeWidth?: number;
  linecap?: "round" | "square" | "butt";
  fill?: string;
  opacity?: number;
}

/**
 * Renders an SVG `<path>` with a progressive draw-on animation driven by
 * Remotion frames. Uses the `pathLength="1"` normalization trick so no
 * DOM measurement is needed — works in both server-side and browser renders.
 */
export const DrawPath = ({
  d,
  color = "#1C1C1C",
  startFrame = 0,
  durationInFrames = 30,
  strokeWidth = 4,
  linecap = "round",
  fill = "none",
  opacity = 1,
}: DrawPathProps) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <path
      d={d}
      fill={fill}
      opacity={opacity}
      pathLength={1}
      stroke={color}
      strokeDasharray="1"
      strokeDashoffset={1 - progress}
      strokeLinecap={linecap}
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
};
