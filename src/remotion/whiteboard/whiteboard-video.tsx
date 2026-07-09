import "./whiteboard.vars.css";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame } from "remotion";

import { BulletsSceneComponent } from "./scenes/bullets-scene";
import { CalloutSceneComponent } from "./scenes/callout-scene";
import { CtaSceneComponent } from "./scenes/cta-scene";
import { DiagramSceneComponent } from "./scenes/diagram-scene";
import { TitleSceneComponent } from "./scenes/title-scene";
import type {
  WhiteboardScene,
  WhiteboardVideoProps,
} from "./whiteboard-schema";

// Permanent Marker — an actual handwritten-marker Google Font
loadFont();

/**
 * WhiteboardVideo — a Remotion composition that renders animated
 * whiteboard-style explainer videos.
 *
 * Each scene handles its own draw timeline internally using `useCurrentFrame()`
 * (local to its `<Sequence>`). When a scene has a `narration.audioUrl`, the
 * ElevenLabs-generated MP3 plays in sync via Remotion's `<Audio>`.
 */
export const WhiteboardVideo = ({
  accentColor,
  backgroundColor,
  inkColor,
  scenes,
  showHand,
  handVideoSrc,
  handSrc,
  handTipXRatio,
  handTipYRatio,
}: WhiteboardVideoProps) => {
  // Compute cumulative start frames for each scene, respecting audio overrides.
  const sceneStarts = scenes.reduce<number[]>((acc, _scene, i) => {
    if (i === 0) {
      return [0];
    }
    const prev = acc[i - 1] ?? 0;
    const prevScene = scenes[i - 1];
    return [...acc, prev + effectiveDuration(prevScene)];
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <PaperTexture inkColor={inkColor} />

      {scenes.map((scene, i) => {
        const startFrom = sceneStarts[i] ?? 0;
        const duration = effectiveDuration(scene);
        const sharedProps = {
          accentColor,
          inkColor,
          showHand,
          handVideoSrc,
          handSrc,
          handTipXRatio,
          handTipYRatio,
        };
        const audioUrl = scene.narration?.audioUrl;
        const illUrl = scene.illustrationUrl;

        return (
          <Sequence
            key={`${scene.type}-${i}`}
            durationInFrames={duration}
            from={startFrom}
          >
            {/* AI-generated illustration panel (right side, fades in) */}
            {illUrl && (
              <IllustrationPanel url={illUrl} accentColor={accentColor} />
            )}

            {scene.type === "title" && (
              <TitleSceneComponent scene={scene} {...sharedProps} />
            )}
            {scene.type === "bullets" && (
              <BulletsSceneComponent scene={scene} {...sharedProps} />
            )}
            {scene.type === "callout" && (
              <CalloutSceneComponent scene={scene} {...sharedProps} />
            )}
            {scene.type === "diagram" && (
              <DiagramSceneComponent scene={scene} {...sharedProps} />
            )}
            {scene.type === "cta" && (
              <CtaSceneComponent scene={scene} {...sharedProps} />
            )}

            {/* ElevenLabs narration audio — synced to this scene's sequence */}
            {audioUrl && (
              <Audio
                pauseWhenBuffering
                src={audioUrl}
                startFrom={0}
                volume={1}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const FPS = 30;

/** Scene duration accounting for audio length override. */
const effectiveDuration = (scene: WhiteboardScene): number => {
  const audioDurationMs = scene.narration?.audioDurationMs;
  if (audioDurationMs && audioDurationMs > 0) {
    // Pad by 0.5s so audio doesn't clip right on the scene boundary
    return Math.ceil(((audioDurationMs + 500) / 1000) * FPS);
  }
  return scene.durationInFrames;
};

// ─── Illustration panel ───────────────────────────────────────────────────────

interface IllustrationPanelProps {
  url: string;
  accentColor: string;
}

const IllustrationPanel = ({ url, accentColor }: IllustrationPanelProps) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(1, frame / 12);

  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        top: 60,
        width: 560,
        height: 440,
        borderRadius: 12,
        overflow: "hidden",
        opacity,
        boxShadow: `0 4px 32px ${accentColor}22, 0 1px 8px rgba(0,0,0,0.08)`,
        border: `2.5px solid ${accentColor}22`,
        backgroundColor: "#fff",
      }}
    >
      <Img
        src={url}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          padding: 16,
        }}
      />
    </div>
  );
};

// ─── Paper texture ─────────────────────────────────────────────────────────────

interface PaperTextureProps {
  inkColor: string;
}

const PaperTexture = ({ inkColor }: PaperTextureProps) => {
  useCurrentFrame();

  return (
    <svg
      aria-hidden="true"
      height="100%"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          height="60"
          id="wb-grid"
          patternUnits="userSpaceOnUse"
          width="60"
        >
          <line
            stroke={inkColor}
            strokeOpacity="0.04"
            strokeWidth="1"
            x1="0"
            x2="60"
            y1="30"
            y2="30"
          />
          <line
            stroke={inkColor}
            strokeOpacity="0.02"
            strokeWidth="0.5"
            x1="0"
            x2="60"
            y1="60"
            y2="60"
          />
          <circle cx="30" cy="30" fill={inkColor} opacity="0.03" r="1" />
        </pattern>
      </defs>
      <rect fill="url(#wb-grid)" height="100%" width="100%" />
      <rect
        fill="none"
        height="100%"
        stroke={inkColor}
        strokeOpacity="0.06"
        strokeWidth="8"
        width="100%"
        x="0"
        y="0"
      />
    </svg>
  );
};
