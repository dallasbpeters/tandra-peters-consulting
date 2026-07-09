import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { AnimatedDrawing } from "../components/animated-drawing";
import { DrawPath } from "../components/draw-path";
import { HandCursor } from "../components/hand-cursor";
import { WriteText } from "../components/write-text";
import type { DiagramScene } from "../whiteboard-schema";

interface DiagramSceneProps {
  scene: DiagramScene;
  accentColor: string;
  inkColor: string;
  showHand: boolean;
  handVideoSrc?: string;
  handSrc?: string;
  handTipXRatio?: number;
  handTipYRatio?: number;
}

/**
 * Whiteboard diagram / process steps scene.
 *
 * Renders numbered circles connected by arrows from left to right.
 * Supports up to 5 steps; 3 is the sweet spot.
 *
 * Timeline per step:
 *   – Number circle drawn (16 frames)
 *   – Label written (proportional to char count)
 *   – Detail written (proportional)
 *   – Arrow to next step drawn (12 frames)
 */
export const DiagramSceneComponent = ({
  scene,
  accentColor,
  inkColor,
  showHand,
  handVideoSrc,
  handSrc,
  handTipXRatio,
  handTipYRatio,
}: DiagramSceneProps) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width / 2;
  const headingDuration = Math.max(20, scene.heading.length * 2);
  const headingEndFrame = headingDuration + 5;
  const underlineEnd = headingEndFrame + 18 + 8;

  const hasDrawing = (scene.drawing?.paths?.length ?? 0) > 0;
  const drawingPaths = scene.drawing?.paths ?? [];
  const drawingViewBox = scene.drawing?.viewBox ?? "0 0 300 300";
  // Drawing sits bottom-right, complementing the diagram steps
  const drawingSize = 300;
  const drawingX = width - drawingSize - 60;
  const drawingY = height - drawingSize - 60;
  const drawingStartFrame = underlineEnd;
  const drawingDuration = hasDrawing
    ? Math.max(50, drawingPaths.length * 12)
    : 0;

  const STEP_Y = height / 2 + 60;
  const CIRCLE_R = 68;
  const steps = scene.steps.slice(0, 5);
  const colWidth = (width - 280) / steps.length;
  const stepXs = steps.map((_, i) => 140 + colWidth * i + colWidth / 2);

  const FRAMES_PER_STEP = 70;

  // Arrow path between consecutive steps
  const arrowPath = (x1: number, x2: number, y: number) => {
    const midX = (x1 + x2) / 2;
    return (
      `M ${x1 + CIRCLE_R + 10},${y} ` +
      `C ${midX},${y - 10} ${midX},${y + 10} ${x2 - CIRCLE_R - 10},${y} ` +
      `M ${x2 - CIRCLE_R - 24},${y - 14} L ${x2 - CIRCLE_R - 10},${y} L ${x2 - CIRCLE_R - 24},${y + 14}`
    );
  };

  // Hand tracks across steps
  const activeStepIdx = Math.min(
    Math.floor(Math.max(0, frame - underlineEnd) / FRAMES_PER_STEP),
    steps.length - 1
  );
  const handX = stepXs[activeStepIdx] ?? cx;

  return (
    <>
      <svg
        height={height}
        style={{ position: "absolute", inset: 0 }}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Heading */}
        <WriteText
          color={inkColor}
          dominantBaseline="auto"
          durationInFrames={headingDuration}
          fontFamily="Permanent Marker"
          fontSize={80}
          fontWeight={700}
          startFrame={0}
          text={scene.heading}
          textAnchor="middle"
          x={cx}
          y={150}
        />

        {/* Heading underline */}
        <DrawPath
          color={accentColor}
          d={`M ${cx - 320},166 C ${cx - 100},171 ${cx + 100},163 ${cx + 320},167`}
          durationInFrames={18}
          startFrame={headingEndFrame}
          strokeWidth={5}
        />

        {/* AI-generated drawing (bottom-right corner when present) */}
        {hasDrawing && (
          <AnimatedDrawing
            color={inkColor}
            durationInFrames={drawingDuration}
            height={drawingSize}
            paths={drawingPaths}
            startFrame={drawingStartFrame}
            strokeWidth={6}
            viewBox={drawingViewBox}
            width={drawingSize}
            x={drawingX}
            y={drawingY}
          />
        )}

        {/* Steps */}
        {steps.map((step, i) => {
          const stepStart = underlineEnd + i * FRAMES_PER_STEP;
          const circleStart = stepStart;
          const numStart = stepStart + 16;
          const labelStart = numStart + 8;
          const labelDuration = Math.max(14, step.label.length * 3);
          const detailStart = labelStart + labelDuration + 4;
          const detailDuration = step.detail
            ? Math.max(12, step.detail.length * 2)
            : 0;

          const x = stepXs[i];
          if (x === undefined) {
            return null;
          }

          const hasNext = i < steps.length - 1;
          const nextX = stepXs[i + 1];
          const arrowStart = stepStart + FRAMES_PER_STEP - 12;

          const circlePath =
            `M ${x + CIRCLE_R},${STEP_Y} ` +
            `a ${CIRCLE_R},${CIRCLE_R} 0 1,0 -${CIRCLE_R * 2},0 ` +
            `a ${CIRCLE_R},${CIRCLE_R} 0 1,0 ${CIRCLE_R * 2},0`;

          const circleFillOpacity = interpolate(
            frame,
            [circleStart, circleStart + 16],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <g key={`${step.label}-${i}`}>
              <circle
                cx={x}
                cy={STEP_Y}
                fill={accentColor}
                opacity={circleFillOpacity * 0.12}
                r={CIRCLE_R}
              />
              <DrawPath
                color={accentColor}
                d={circlePath}
                durationInFrames={16}
                startFrame={circleStart}
                strokeWidth={4}
              />
              <WriteText
                color={accentColor}
                dominantBaseline="middle"
                durationInFrames={8}
                fontFamily="Permanent Marker"
                fontSize={72}
                fontWeight={700}
                startFrame={numStart}
                text={String(i + 1)}
                textAnchor="middle"
                x={x}
                y={STEP_Y}
              />
              <WriteText
                color={inkColor}
                dominantBaseline="auto"
                durationInFrames={labelDuration}
                fontFamily="Permanent Marker"
                fontSize={58}
                fontWeight={700}
                startFrame={labelStart}
                text={step.label}
                textAnchor="middle"
                x={x}
                y={STEP_Y + CIRCLE_R + 54}
              />
              {step.detail && (
                <WriteText
                  color={`${inkColor}99`}
                  dominantBaseline="auto"
                  durationInFrames={detailDuration}
                  fontFamily="Permanent Marker"
                  fontSize={40}
                  fontWeight={400}
                  startFrame={detailStart}
                  text={step.detail}
                  textAnchor="middle"
                  x={x}
                  y={STEP_Y + CIRCLE_R + 106}
                />
              )}
              {hasNext && nextX !== undefined && (
                <DrawPath
                  color={`${inkColor}88`}
                  d={arrowPath(x, nextX, STEP_Y)}
                  durationInFrames={12}
                  startFrame={arrowStart}
                  strokeWidth={3.5}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Hand rendered outside <svg> so <HandVideo>'s <div> composites correctly */}
      {showHand && frame >= underlineEnd && (
        <HandCursor
          src={handSrc}
          tipXRatio={handTipXRatio}
          tipYRatio={handTipYRatio}
          videoSrc={handVideoSrc}
          x={handX}
          y={STEP_Y - 40}
        />
      )}
    </>
  );
};
