import { useId } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

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

interface WriteTextProps {
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
  /** Frames over which the wipe completes. */
  durationInFrames?: number;
  letterSpacing?: number;
  opacity?: number;
}

/**
 * SVG text element revealed by a left-to-right clip-path wipe, simulating
 * a marker being drawn across the canvas. Uses `pathLength="1"` so no DOM
 * measurement is needed — works in both server-side and browser Remotion renders.
 *
 * The clip rect grows from x=0 to x=fullWidth over `durationInFrames`, which
 * naturally reveals text at its layout position from left to right in sync
 * with the HandMarker cursor.
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
}: WriteTextProps) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const rawId = useId();
  // Strip colon characters; SVG ids must not start with a digit or contain colons
  const clipId = `wt${rawId.replaceAll(":", "")}`;

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const yNum = typeof y === "string" ? Number.parseFloat(y) : y;

  // Clip rect sweeps the full canvas width left-to-right regardless of text x.
  // This means text positioned anywhere on the canvas is unveiled naturally
  // as the wipe progresses — no font metric measurement needed for SSR.
  const clipTop = yNum - fontSize * 1.5;
  const clipHeight = fontSize * 2.5;
  const clipWidth = width * progress;

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
