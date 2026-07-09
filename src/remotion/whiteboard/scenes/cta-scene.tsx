import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { AnimatedDrawing } from "../components/animated-drawing";
import { DrawPath } from "../components/draw-path";
import { HandCursor } from "../components/hand-cursor";
import { WriteText } from "../components/write-text";
import type { CtaScene } from "../whiteboard-schema";

interface CtaSceneProps {
  scene: CtaScene;
  accentColor: string;
  inkColor: string;
  showHand: boolean;
  handVideoSrc?: string;
  handSrc?: string;
  handTipXRatio?: number;
  handTipYRatio?: number;
}

/**
 * Whiteboard CTA scene.
 *
 * Timeline:
 *   0–35  : headline written
 *   38–55 : double underline drawn
 *   58–90 : action text written (phone number / URL)
 *   92–108: circle/ellipse drawn around action
 *   110+  : byline + badge appear, hold
 */
export const CtaSceneComponent = ({
  scene,
  accentColor,
  inkColor,
  showHand,
  handVideoSrc,
  handSrc,
  handTipXRatio,
  handTipYRatio,
}: CtaSceneProps) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  const hasDrawing = (scene.drawing?.paths?.length ?? 0) > 0;
  const drawingPaths = scene.drawing?.paths ?? [];
  const drawingViewBox = scene.drawing?.viewBox ?? "0 0 300 300";
  const drawingSize = 320;
  const drawingX = 60;
  const drawingY = Math.round((height - drawingSize) / 2);
  const drawingStartFrame = 0;
  const drawingDuration = hasDrawing
    ? Math.max(50, drawingPaths.length * 12)
    : 0;

  const headlineLines = scene.headline.split("\n");
  const headlineTotalChars = scene.headline.replaceAll("\n", "").length;
  const headlineStart = 0;
  const headlineDuration = Math.max(25, headlineTotalChars * 2);
  const headlineEndFrame = headlineStart + headlineDuration;

  const LINE_HEIGHT = 110;
  const headlineBaseY = cy - headlineLines.length * (LINE_HEIGHT / 2) - 60;

  const ul1Start = headlineEndFrame + 5;
  const ul1Duration = 18;
  const ul2Start = ul1Start + ul1Duration + 3;
  const ul2Duration = 16;
  const underlineY = headlineBaseY + headlineLines.length * LINE_HEIGHT + 20;

  const actionStart = ul2Start + ul2Duration + 10;
  const actionDuration = Math.max(20, scene.action.length * 2);
  const actionEndFrame = actionStart + actionDuration;
  const actionY = underlineY + 90;

  const circleStart = actionEndFrame + 5;
  const circleDuration = 18;
  const ellipsePath =
    `M ${cx - 400},${actionY} ` +
    `C ${cx - 410},${actionY - 55} ${cx + 410},${actionY - 55} ${cx + 400},${actionY} ` +
    `C ${cx + 410},${actionY + 55} ${cx - 410},${actionY + 55} ${cx - 400},${actionY}`;

  const bylineStart = circleStart + circleDuration + 8;
  const bylineDuration = Math.max(15, scene.byline.length * 2);
  const badgeStart = bylineStart + bylineDuration + 6;

  const handX = cx;
  const handY = actionY - 50;

  // Scale-up animation on action text
  const actionScale = interpolate(
    frame,
    [actionStart, actionStart + 10],
    [0.88, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
        {/* AI-generated drawing (left side when present) */}
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

        {/* Headline */}
        {headlineLines.map((line, i) => {
          const charsBeforeLine = headlineLines.slice(0, i).join("").length;
          const lineStart =
            headlineStart +
            Math.floor(
              (charsBeforeLine / Math.max(1, headlineTotalChars)) *
                headlineDuration
            );
          const lineDuration = Math.max(
            12,
            Math.floor(
              (line.length / Math.max(1, headlineTotalChars)) * headlineDuration
            )
          );

          return (
            <WriteText
              key={`${line}-${i}`}
              color={inkColor}
              dominantBaseline="auto"
              durationInFrames={lineDuration}
              fontFamily="Permanent Marker"
              fontSize={102}
              fontWeight={700}
              startFrame={lineStart}
              text={line}
              textAnchor="middle"
              x={cx}
              y={headlineBaseY + (i + 1) * LINE_HEIGHT}
            />
          );
        })}

        {/* Double underline */}
        <DrawPath
          color={accentColor}
          d={`M ${cx - 380},${underlineY} C ${cx - 100},${underlineY + 7} ${cx + 100},${underlineY - 5} ${cx + 380},${underlineY + 3}`}
          durationInFrames={ul1Duration}
          startFrame={ul1Start}
          strokeWidth={5.5}
        />
        <DrawPath
          color={accentColor}
          d={`M ${cx - 360},${underlineY + 14} C ${cx - 80},${underlineY + 19} ${cx + 120},${underlineY + 11} ${cx + 360},${underlineY + 16}`}
          durationInFrames={ul2Duration}
          startFrame={ul2Start}
          strokeWidth={4}
        />

        {/* Action text */}
        <g
          transform={`scale(${actionScale}) translate(${cx * (1 - actionScale)}, ${actionY * (1 - actionScale)})`}
        >
          <WriteText
            color={accentColor}
            dominantBaseline="middle"
            durationInFrames={actionDuration}
            fontFamily="Permanent Marker"
            fontSize={72}
            fontWeight={700}
            startFrame={actionStart}
            text={scene.action}
            textAnchor="middle"
            x={cx}
            y={actionY}
          />
        </g>

        {/* Ellipse around action */}
        <DrawPath
          color={accentColor}
          d={ellipsePath}
          durationInFrames={circleDuration}
          startFrame={circleStart}
          strokeWidth={4}
        />

        {/* Byline */}
        <WriteText
          color={`${inkColor}99`}
          dominantBaseline="middle"
          durationInFrames={bylineDuration}
          fontFamily="Permanent Marker"
          fontSize={42}
          fontWeight={400}
          startFrame={bylineStart}
          text={scene.byline}
          textAnchor="middle"
          x={cx}
          y={actionY + 100}
        />

        {/* Badge */}
        {scene.badge && (
          <WriteText
            color={accentColor}
            dominantBaseline="middle"
            durationInFrames={Math.max(12, scene.badge.length * 2)}
            fontFamily="Permanent Marker"
            fontSize={38}
            fontWeight={600}
            startFrame={badgeStart}
            text={scene.badge}
            textAnchor="middle"
            x={cx}
            y={actionY + 150}
          />
        )}
      </svg>

      {/* Hand rendered outside <svg> so <HandVideo>'s <div> composites correctly */}
      {showHand &&
        frame >= actionStart &&
        frame < circleStart + circleDuration && (
          <HandCursor
            src={handSrc}
            tipXRatio={handTipXRatio}
            tipYRatio={handTipYRatio}
            videoSrc={handVideoSrc}
            x={handX}
            y={handY}
          />
        )}
    </>
  );
};
