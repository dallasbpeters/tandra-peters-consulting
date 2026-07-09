import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import {
  AnimatedDrawing,
  drawingHandPos,
} from "../components/animated-drawing";
import { DrawPath } from "../components/draw-path";
import { HandCursor } from "../components/hand-cursor";
import { WriteText } from "../components/write-text";
import type { TitleScene } from "../whiteboard-schema";

interface TitleSceneProps {
  scene: TitleScene;
  accentColor: string;
  inkColor: string;
  showHand: boolean;
  handVideoSrc?: string;
  handSrc?: string;
  handTipXRatio?: number;
  handTipYRatio?: number;
}

/**
 * Whiteboard title scene.
 *
 * Timeline (in local frames):
 *   0–8   : fade in
 *   8–55  : headline written character-by-character
 *   55–75 : accent underline drawn beneath headline
 *   78–105: subtitle written
 *   105+  : hold
 */
export const TitleSceneComponent = ({
  scene,
  accentColor,
  inkColor,
  showHand,
  handVideoSrc,
  handSrc,
  handTipXRatio,
  handTipYRatio,
}: TitleSceneProps) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  const hasDrawing = (scene.drawing?.paths?.length ?? 0) > 0;

  // ── Layout constants ─────────────────────────────────────────────────────
  // When a drawing is present the canvas splits: drawing left 65%, text right 35%.
  // Without a drawing the text is centred (original layout).
  const drawingW = hasDrawing ? Math.round(width * 0.62) : 0;
  const drawingH = hasDrawing ? Math.round(height * 0.8) : 0;
  const drawingX = hasDrawing ? Math.round(width * 0.02) : 0;
  const drawingY = hasDrawing ? Math.round((height - drawingH) / 2) : 0;

  const textCx = hasDrawing ? Math.round(width * 0.68 + (width * 0.3) / 2) : cx;
  const textCy = hasDrawing ? cy : cy;

  const containerOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Headline can be multi-line via \n
  const headlineLines = scene.headline.split("\n");
  const lineHeight = hasDrawing ? 110 : 130;
  const headlineFontSize = hasDrawing ? 90 : 112;
  const headlineTotalChars = scene.headline.replaceAll("\n", "").length;

  // ── Drawing timeline ──────────────────────────────────────────────────────
  const drawingStartFrame = 8;
  const drawingPaths = scene.drawing?.paths ?? [];
  const drawingViewBox = scene.drawing?.viewBox ?? "0 0 300 300";
  const drawingDuration = hasDrawing
    ? Math.max(60, drawingPaths.length * 14)
    : 0;
  const drawingEndFrame = drawingStartFrame + drawingDuration;

  // ── Text timeline (starts after drawing, or at frame 8 if no drawing) ────
  const headlineStartFrame = hasDrawing ? drawingEndFrame + 4 : 8;
  const headlineDuration = Math.max(30, headlineTotalChars * 2);
  const headlineEndFrame = headlineStartFrame + headlineDuration;

  // Underline path — slightly wavy for handmade feel
  const underlineY =
    textCy + (headlineLines.length - 1) * (lineHeight / 2) + 70;
  const underlineStartX = textCx - 340;
  const underlineEndX = textCx + 340;
  const underlinePath = `M ${underlineStartX},${underlineY} C ${textCx - 200},${underlineY + 8} ${textCx + 100},${underlineY - 6} ${underlineEndX},${underlineY + 4}`;

  const underlineStart = headlineEndFrame + 5;
  const underlineDuration = 20;

  // Subtitle
  const subtitleStartFrame = underlineStart + underlineDuration + 8;
  const subtitleChars = (scene.subtitle ?? "").length;
  const subtitleDuration = Math.max(20, subtitleChars * 2);

  // ── Hand cursor position ──────────────────────────────────────────────────
  let handX: number;
  let handY: number;

  if (hasDrawing && frame < drawingEndFrame) {
    // Track drawing tip
    const tip = drawingHandPos(
      drawingPaths,
      drawingViewBox,
      drawingStartFrame,
      drawingDuration,
      frame,
      drawingX,
      drawingY,
      drawingW,
      drawingH
    );
    handX = tip.x;
    handY = tip.y;
  } else {
    // Track headline writing
    const headlineProgress = interpolate(
      frame,
      [headlineStartFrame, headlineEndFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    handX = textCx - 340 + headlineProgress * 680;
    handY = textCy - 20;

    // After headline: track underline
    if (frame >= underlineStart) {
      const underlineProgress = interpolate(
        frame,
        [underlineStart, underlineStart + underlineDuration],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      handX =
        underlineStartX + underlineProgress * (underlineEndX - underlineStartX);
      handY = underlineY - 60;
    }
  }

  return (
    <>
      <svg
        aria-hidden="true"
        height={height}
        opacity={containerOpacity}
        style={{ position: "absolute", inset: 0 }}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* AI-generated drawing (left panel when present) */}
        {hasDrawing && (
          <AnimatedDrawing
            color={inkColor}
            durationInFrames={drawingDuration}
            height={drawingH}
            paths={drawingPaths}
            startFrame={drawingStartFrame}
            strokeWidth={7}
            viewBox={drawingViewBox}
            width={drawingW}
            x={drawingX}
            y={drawingY}
          />
        )}

        {/* Eyebrow label */}
        {scene.eyebrow && (
          <WriteText
            color={accentColor}
            dominantBaseline="middle"
            durationInFrames={Math.max(15, scene.eyebrow.length * 2)}
            fontFamily="Permanent Marker"
            fontSize={42}
            fontWeight={600}
            startFrame={headlineStartFrame - 4}
            text={scene.eyebrow}
            textAnchor="middle"
            x={textCx}
            y={textCy - (headlineLines.length * lineHeight) / 2 - 60}
          />
        )}

        {/* Headline lines */}
        {headlineLines.map((line, i) => {
          const charsBeforeThisLine = headlineLines.slice(0, i).join("").length;
          const lineStartFrame =
            headlineStartFrame +
            Math.floor(
              (charsBeforeThisLine / headlineTotalChars) * headlineDuration
            );
          const lineDuration = Math.max(
            15,
            Math.floor((line.length / headlineTotalChars) * headlineDuration)
          );

          return (
            <WriteText
              key={line + i}
              color={inkColor}
              dominantBaseline="middle"
              durationInFrames={lineDuration}
              fontFamily="Permanent Marker"
              fontSize={headlineFontSize}
              fontWeight={700}
              startFrame={lineStartFrame}
              text={line}
              textAnchor="middle"
              x={textCx}
              y={
                textCy +
                i * lineHeight -
                ((headlineLines.length - 1) * lineHeight) / 2
              }
            />
          );
        })}

        {/* Accent underline */}
        <DrawPath
          color={accentColor}
          d={underlinePath}
          durationInFrames={underlineDuration}
          startFrame={underlineStart}
          strokeWidth={6}
        />

        {/* Subtitle */}
        {scene.subtitle && (
          <WriteText
            color={`${inkColor}CC`}
            dominantBaseline="middle"
            durationInFrames={subtitleDuration}
            fontFamily="Permanent Marker"
            fontSize={52}
            fontWeight={400}
            startFrame={subtitleStartFrame}
            text={scene.subtitle}
            textAnchor="middle"
            x={textCx}
            y={underlineY + 70}
          />
        )}
      </svg>

      {/* Hand rendered outside <svg> so <HandVideo>'s <div> composites correctly */}
      {showHand && frame >= drawingStartFrame && frame < subtitleStartFrame && (
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
