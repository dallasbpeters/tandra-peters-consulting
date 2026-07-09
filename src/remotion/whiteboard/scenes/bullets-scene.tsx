import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import {
  AnimatedDrawing,
  drawingHandPos,
} from "../components/animated-drawing";
import { DrawPath } from "../components/draw-path";
import { HandCursor } from "../components/hand-cursor";
import { WriteText } from "../components/write-text";
import type { BulletsScene } from "../whiteboard-schema";

interface BulletsSceneProps {
  scene: BulletsScene;
  accentColor: string;
  inkColor: string;
  showHand: boolean;
  handVideoSrc?: string;
  handSrc?: string;
  handTipXRatio?: number;
  handTipYRatio?: number;
}

const CHECKBOX_SIZE = 52;
const BULLET_LINE_HEIGHT = 90;
const CONTENT_TOP = 260;
const LEFT_MARGIN = 180;

/**
 * Draws a checkbox (square outline) as a single clockwise SVG path.
 * Using absolute coords so we can position each via `g[transform]`.
 */
const checkboxPath = (x: number, y: number, s: number) =>
  `M ${x},${y} L ${x + s},${y} L ${x + s},${y + s} L ${x},${y + s} Z`;

/** Checkmark tick inside the box. */
const checkmarkPath = (x: number, y: number, s: number) =>
  `M ${x + s * 0.15},${y + s * 0.5} L ${x + s * 0.4},${y + s * 0.75} L ${x + s * 0.85},${y + s * 0.2}`;

/** Simple bullet circle path (center x, y, radius r). */
const bulletCirclePath = (cx: number, cy: number, r: number) =>
  `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`;

/**
 * Whiteboard bullets scene.
 *
 * Timeline:
 *   0–25    : heading written
 *   25–40   : heading underline drawn
 *   40+     : for each bullet (staggered):
 *               – checkbox drawn (18 frames)
 *               – checkmark drawn (10 frames)
 *               – bullet text written
 */
export const BulletsSceneComponent = ({
  scene,
  accentColor,
  inkColor,
  showHand,
  handVideoSrc,
  handSrc,
  handTipXRatio,
  handTipYRatio,
}: BulletsSceneProps) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const hasDrawing = (scene.drawing?.paths?.length ?? 0) > 0;
  const drawingPaths = scene.drawing?.paths ?? [];
  const drawingViewBox = scene.drawing?.viewBox ?? "0 0 300 300";

  // When a drawing is present it occupies the right 50% of the canvas.
  // Bullets shift to the left 48%.
  const leftMargin = hasDrawing ? 130 : LEFT_MARGIN;

  const drawingW = hasDrawing ? Math.round(width * 0.46) : 0;
  const drawingH = hasDrawing ? Math.round(height * 0.72) : 0;
  const drawingX = hasDrawing ? Math.round(width * 0.52) : 0;
  const drawingY = hasDrawing ? Math.round((height - drawingH) / 2) : 0;

  const headingStartFrame = 0;
  const headingDuration = Math.max(20, scene.heading.length * 2);
  const headingEndFrame = headingStartFrame + headingDuration;

  const underlineStart = headingEndFrame + 5;
  const underlineDuration = 18;
  const underlineEnd = underlineStart + underlineDuration;

  // Drawing happens alongside bullets (starts same time as bullets content)
  const bulletAreaStart = underlineEnd + 10;
  const framesPerBullet = 80;
  const bulletsEndFrame =
    bulletAreaStart + scene.bullets.length * framesPerBullet;

  const drawingStartFrame = underlineEnd;
  const drawingDuration = hasDrawing
    ? Math.max(60, bulletsEndFrame - drawingStartFrame)
    : 0;

  // Hand tracking
  const isBulletPhase = frame >= bulletAreaStart;
  const isDrawingPhase =
    hasDrawing && frame >= drawingStartFrame && frame < bulletsEndFrame;
  const activeBulletIdx = isBulletPhase
    ? Math.min(
        Math.floor((frame - bulletAreaStart) / framesPerBullet),
        scene.bullets.length - 1
      )
    : -1;

  let handX: number;
  let handY: number;

  if (isDrawingPhase) {
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
    const bx = leftMargin;
    const bulletTextX = bx + CHECKBOX_SIZE + 24;
    handX = isBulletPhase ? bulletTextX : width / 2;
    handY = isBulletPhase
      ? CONTENT_TOP + activeBulletIdx * BULLET_LINE_HEIGHT + CHECKBOX_SIZE / 2
      : height / 2 - 40;
  }

  const bx = leftMargin;
  const bulletTextX = bx + CHECKBOX_SIZE + 24;

  return (
    <>
      <svg
        aria-hidden="true"
        height={height}
        style={{ position: "absolute", inset: 0 }}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
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
          startFrame={headingStartFrame}
          text={scene.heading}
          textAnchor="start"
          x={leftMargin}
          y={170}
        />

        {/* Heading accent underline */}
        <DrawPath
          color={accentColor}
          d={`M ${leftMargin},185 C ${leftMargin + 100},189 ${leftMargin + scene.heading.length * 22},182 ${leftMargin + scene.heading.length * 22 + 20},186`}
          durationInFrames={underlineDuration}
          startFrame={underlineStart}
          strokeWidth={5}
        />

        {/* AI-generated drawing (right panel when present) */}
        {hasDrawing && (
          <AnimatedDrawing
            color={inkColor}
            durationInFrames={drawingDuration}
            height={drawingH}
            paths={drawingPaths}
            startFrame={drawingStartFrame}
            strokeWidth={6}
            viewBox={drawingViewBox}
            width={drawingW}
            x={drawingX}
            y={drawingY}
          />
        )}

        {/* Bullets */}
        {scene.bullets.map((bullet, i) => {
          const bStart = bulletAreaStart + i * framesPerBullet;
          const by = CONTENT_TOP + i * BULLET_LINE_HEIGHT;
          const checkboxStart = bStart;
          const checkmarkStart = bStart + 18;
          const textStart = bStart + 28;
          const textDuration = Math.max(20, bullet.length * 2);

          return (
            <g key={`${bullet}-${i}`}>
              {scene.useCheckboxes ? (
                <>
                  {/* Checkbox outline */}
                  <DrawPath
                    color={inkColor}
                    d={checkboxPath(bx, by, CHECKBOX_SIZE)}
                    durationInFrames={18}
                    startFrame={checkboxStart}
                    strokeWidth={3.5}
                  />
                  {/* Checkmark */}
                  <DrawPath
                    color={accentColor}
                    d={checkmarkPath(bx, by, CHECKBOX_SIZE)}
                    durationInFrames={12}
                    startFrame={checkmarkStart}
                    strokeWidth={4.5}
                  />
                </>
              ) : (
                /* Bullet circle */
                <DrawPath
                  color={accentColor}
                  d={bulletCirclePath(bx + 14, by + 26, 12)}
                  durationInFrames={14}
                  startFrame={checkboxStart}
                  strokeWidth={3.5}
                />
              )}

              {/* Bullet text */}
              <WriteText
                color={inkColor}
                dominantBaseline="middle"
                durationInFrames={textDuration}
                fontFamily="Permanent Marker"
                fontSize={58}
                fontWeight={600}
                startFrame={textStart}
                text={bullet}
                textAnchor="start"
                x={bulletTextX}
                y={by + CHECKBOX_SIZE / 2}
              />
            </g>
          );
        })}
      </svg>

      {/* Hand rendered outside <svg> so <HandVideo>'s <div> composites correctly */}
      {showHand && (
        <HandCursor
          src={handSrc}
          tipXRatio={handTipXRatio}
          tipYRatio={handTipYRatio}
          videoSrc={handVideoSrc}
          visible={
            frame >= headingStartFrame &&
            frame < bulletAreaStart + scene.bullets.length * framesPerBullet
          }
          x={handX}
          y={handY}
        />
      )}
    </>
  );
};
