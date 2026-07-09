import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

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

  const containerOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Headline can be multi-line via \n
  const headlineLines = scene.headline.split("\n");
  const lineHeight = 130;
  const headlineFontSize = 112;
  const headlineTotalChars = scene.headline.replaceAll("\n", "").length;
  const headlineStartFrame = 8;
  const headlineDuration = Math.max(30, headlineTotalChars * 2);
  const headlineEndFrame = headlineStartFrame + headlineDuration;

  // Underline path — slightly wavy for handmade feel
  const underlineY = cy + (headlineLines.length - 1) * (lineHeight / 2) + 70;
  const underlineStartX = cx - 400;
  const underlineEndX = cx + 400;
  const underlinePath = `M ${underlineStartX},${underlineY} C ${cx - 200},${underlineY + 8} ${cx + 100},${underlineY - 6} ${underlineEndX},${underlineY + 4}`;

  const underlineStart = headlineEndFrame + 5;
  const underlineDuration = 20;

  // Subtitle
  const subtitleStartFrame = underlineStart + underlineDuration + 8;
  const subtitleChars = (scene.subtitle ?? "").length;
  const subtitleDuration = Math.max(20, subtitleChars * 2);

  // Hand X tracks to end of writing
  const headlineProgress = interpolate(
    frame,
    [headlineStartFrame, headlineEndFrame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const handX = cx - 380 + headlineProgress * 760;
  const handY = cy - 20;

  // After headline done, track underline
  const isUnderlinePhase = frame >= underlineStart;
  const underlineProgress = interpolate(
    frame,
    [underlineStart, underlineStart + underlineDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const handXFinal = isUnderlinePhase
    ? underlineStartX + underlineProgress * (underlineEndX - underlineStartX)
    : handX;
  const handYFinal = isUnderlinePhase ? underlineY - 60 : handY;

  return (
    <svg
      height={height}
      opacity={containerOpacity}
      style={{ position: "absolute", inset: 0 }}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Eyebrow label */}
      {scene.eyebrow && (
        <WriteText
          color={accentColor}
          dominantBaseline="middle"
          durationInFrames={Math.max(15, scene.eyebrow.length * 2)}
          fontFamily="Permanent Marker"
          fontSize={42}
          fontWeight={600}
          startFrame={2}
          text={scene.eyebrow}
          textAnchor="middle"
          x={cx}
          y={cy - (headlineLines.length * lineHeight) / 2 - 60}
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
            x={cx}
            y={
              cy +
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
          x={cx}
          y={underlineY + 70}
        />
      )}

      {/* Hand marker */}
      {showHand &&
        frame >= headlineStartFrame &&
        frame < subtitleStartFrame && (
          <HandCursor
            src={handSrc}
            tipXRatio={handTipXRatio}
            tipYRatio={handTipYRatio}
            videoSrc={handVideoSrc}
            x={handXFinal}
            y={handYFinal}
          />
        )}
    </svg>
  );
};
