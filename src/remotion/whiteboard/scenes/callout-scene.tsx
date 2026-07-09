import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { DrawPath } from "../components/draw-path";
import { HandCursor } from "../components/hand-cursor";
import { WriteText } from "../components/write-text";
import type { CalloutScene } from "../whiteboard-schema";

interface CalloutSceneProps {
  scene: CalloutScene;
  accentColor: string;
  inkColor: string;
  showHand: boolean;
  handVideoSrc?: string;
  handSrc?: string;
  handTipXRatio?: number;
  handTipYRatio?: number;
}

/**
 * Whiteboard callout / stat scene.
 *
 * Timeline:
 *   0–22   : callout box drawn (clockwise rectangle)
 *   22–35  : label written (e.g. "Did You Know?")
 *   38–60  : big stat/number drawn (large, accent color)
 *   62–110 : body text written
 *   112+   : emphasis text (if any) + hold
 */
export const CalloutSceneComponent = ({
  scene,
  accentColor,
  inkColor,
  showHand,
  handVideoSrc,
  handSrc,
  handTipXRatio,
  handTipYRatio,
}: CalloutSceneProps) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  // Box dimensions
  const bw = 1300;
  const bh = 560;
  const bx = cx - bw / 2;
  const by = cy - bh / 2;
  const br = 24; // corner radius

  // Rounded-rectangle path drawn clockwise
  const boxPath =
    `M ${bx + br},${by} ` +
    `L ${bx + bw - br},${by} ` +
    `Q ${bx + bw},${by} ${bx + bw},${by + br} ` +
    `L ${bx + bw},${by + bh - br} ` +
    `Q ${bx + bw},${by + bh} ${bx + bw - br},${by + bh} ` +
    `L ${bx + br},${by + bh} ` +
    `Q ${bx},${by + bh} ${bx},${by + bh - br} ` +
    `L ${bx},${by + br} ` +
    `Q ${bx},${by} ${bx + br},${by}`;

  const boxStart = 0;
  const boxDuration = 22;
  const labelStart = boxDuration + 8;
  const labelDuration = Math.max(14, scene.label.length * 2);
  const statStart = labelStart + labelDuration + 8;
  const statDuration = Math.max(18, scene.stat.length * 3);
  const statEnd = statStart + statDuration;
  const bodyStart = statEnd + 8;
  const bodyDuration = Math.max(25, scene.body.length * 2);
  const bodyEnd = bodyStart + bodyDuration;
  const emphasisStart = bodyEnd + 10;
  const emphasisDuration = Math.max(15, (scene.emphasis ?? "").length * 2);

  // Box draw-in opacity
  const boxFillOpacity = interpolate(
    frame,
    [boxStart, boxStart + boxDuration],
    [0, 0.06],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Hand tracks stat writing
  const handX = cx;
  const handY = cy - 20;

  return (
    <svg
      height={height}
      style={{ position: "absolute", inset: 0 }}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Box fill */}
      <rect
        fill={accentColor}
        height={bh}
        opacity={boxFillOpacity}
        rx={br}
        ry={br}
        width={bw}
        x={bx}
        y={by}
      />

      {/* Box outline */}
      <DrawPath
        color={accentColor}
        d={boxPath}
        durationInFrames={boxDuration}
        startFrame={boxStart}
        strokeWidth={4.5}
      />

      {/* Label pill background */}
      {frame >= labelStart && (
        <rect
          fill={accentColor}
          height={52}
          rx={10}
          ry={10}
          width={scene.label.length * 19 + 40}
          x={bx + 40}
          y={by + 32}
        />
      )}

      {/* Label text */}
      <WriteText
        color="#ffffff"
        dominantBaseline="middle"
        durationInFrames={labelDuration}
        fontFamily="Permanent Marker"
        fontSize={36}
        fontWeight={600}
        startFrame={labelStart}
        text={scene.label}
        textAnchor="start"
        x={bx + 60}
        y={by + 58}
      />

      {/* Big stat */}
      <WriteText
        color={accentColor}
        dominantBaseline="middle"
        durationInFrames={statDuration}
        fontFamily="Permanent Marker"
        fontSize={180}
        fontWeight={700}
        startFrame={statStart}
        text={scene.stat}
        textAnchor="middle"
        x={cx - 200}
        y={cy + 20}
      />

      {/* Body text (wrapped manually with tspan for readability) */}
      <WriteText
        color={inkColor}
        dominantBaseline="middle"
        durationInFrames={bodyDuration}
        fontFamily="Permanent Marker"
        fontSize={54}
        fontWeight={400}
        startFrame={bodyStart}
        text={scene.body}
        textAnchor="start"
        x={cx + 20}
        y={cy - 20}
      />

      {/* Emphasis */}
      {scene.emphasis && (
        <WriteText
          color={accentColor}
          dominantBaseline="middle"
          durationInFrames={emphasisDuration}
          fontFamily="Permanent Marker"
          fontSize={50}
          fontWeight={700}
          startFrame={emphasisStart}
          text={scene.emphasis}
          textAnchor="start"
          x={cx + 20}
          y={cy + 60}
        />
      )}

      {/* Hand */}
      {showHand && frame >= statStart && frame < bodyEnd && (
        <HandCursor
          src={handSrc}
          tipXRatio={handTipXRatio}
          tipYRatio={handTipYRatio}
          videoSrc={handVideoSrc}
          x={handX}
          y={handY}
        />
      )}
    </svg>
  );
};
