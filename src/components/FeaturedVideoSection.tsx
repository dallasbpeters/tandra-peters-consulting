import type { PlayerRef } from "@remotion/player";
import { motion, useInView, type Variants } from "motion/react";
import type React from "react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Halftone, Shader, SolidColor, Swirl } from "shaders/react";

import type { TandraIntroContent } from "../remotion/tandraIntroContent";
import { getCaptionCues } from "../remotion/tandraIntroContent";
import { theme } from "../theme";
import { VideoControls } from "./videocontrols";

interface Props {
  introContent?: TandraIntroContent;
  posterUrl?: string;
  title?: string;
  videoUrl?: string;
}

const containerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: `${theme.spacing.xxxxl} ${theme.spacing.lg}`,
};

const shaderStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const mediaSurfaceStyle: React.CSSProperties = {
  position: "relative",
  width: "min(95vw, 1200px)",
  maxWidth: 1200,
  zIndex: 10,
};

const FeaturedRemotionPlayer = lazy(async () => {
  const module = await import("./FeaturedRemotionPlayer");
  return { default: module.FeaturedRemotionPlayer };
});

export function FeaturedVideoSection({
  videoUrl,
  posterUrl,
  introContent,
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<PlayerRef | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [hideControlsUntilMouseLeave, setHideControlsUntilMouseLeave] =
    useState(false);
  const isInView = useInView(sectionRef, { once: true, amount: 0.45 });
  const captionCues = useMemo(
    () => (introContent ? getCaptionCues(introContent) : []),
    [introContent]
  );
  const showRemotionPlayer = Boolean(introContent) && !videoUrl;
  const introContentKey = useMemo(
    () => (introContent ? JSON.stringify(introContent) : "uploaded-video"),
    [introContent]
  );
  const mediaAssetKey = useMemo(
    () =>
      [
        videoUrl ?? "remotion-preview",
        posterUrl ?? "no-poster",
        introContentKey,
      ].join("|"),
    [introContentKey, posterUrl, videoUrl]
  );

  useEffect(() => {
    const updateInputMode = () => {
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const hasNoHover = window.matchMedia("(hover: none)").matches;
      setIsMobileDevice(hasCoarsePointer || hasNoHover);
    };

    updateInputMode();
    window.addEventListener("resize", updateInputMode);
    return () => {
      window.removeEventListener("resize", updateInputMode);
    };
  }, []);

  const handleControlPress = useCallback(() => {
    if (!isMobileDevice) {
      setHideControlsUntilMouseLeave(true);
    }
  }, [isMobileDevice]);

  const shouldShowControls =
    isMobileDevice || (isHoveringVideo && !hideControlsUntilMouseLeave);

  const videoVariants: Variants = {
    offscreen: {
      opacity: 0,
      scale: 0.92,
      y: 56,
    },
    onscreen: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.25,
        duration: 0.95,
      },
    },
  };

  const remotionPlayer = introContent ? (
    <motion.div
      animate={isInView ? "onscreen" : "offscreen"}
      className="featured-video__video featured-video__player"
      initial="offscreen"
      key={`${mediaAssetKey}-player`}
      variants={videoVariants}
    >
      <Suspense
        fallback={
          posterUrl ? (
            // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
            <img
              alt=""
              className="featured-video__poster-image"
              src={posterUrl}
            />
          ) : null
        }
      >
        <FeaturedRemotionPlayer
          content={introContent}
          posterUrl={posterUrl}
          ref={playerRef}
          showCaptions={false}
        />
      </Suspense>
    </motion.div>
  ) : null;

  return (
    <div className="layout-grid-center" ref={sectionRef} style={containerStyle}>
      <Shader style={shaderStyle}>
        {/* Explicit ids: React useId() fallback yields `__` GLSL names that fail on Safari. */}
        <SolidColor color="#09291d" id="videoSolid" />
        <Halftone angle={0} frequency={135} id="videoHalftone">
          <Swirl colorA="#12533A" colorB="#7f65cd" id="videoSwirl" />
        </Halftone>
      </Shader>

      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: mouse/focus events track hover state for UI controls only */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse/focus events track hover state for UI controls only */}
      <div
        onBlurCapture={() => {
          setIsHoveringVideo(false);
          setHideControlsUntilMouseLeave(false);
        }}
        onFocusCapture={() => {
          setIsHoveringVideo(true);
        }}
        onMouseEnter={() => {
          setIsHoveringVideo(true);
        }}
        onMouseLeave={() => {
          setIsHoveringVideo(false);
          setHideControlsUntilMouseLeave(false);
        }}
        style={mediaSurfaceStyle}
      >
        <div className="featured-video__frame">
          {videoUrl ? (
            // Captions are burned into the rendered MP4 by the Remotion
            // composition (see TandraIntro <Captions>), so no sidecar
            // <track> is needed here.
            <motion.video
              animate={isInView ? "onscreen" : "offscreen"}
              className="featured-video__video"
              controls={false}
              initial="offscreen"
              key={`${mediaAssetKey}-video`}
              playsInline
              poster={posterUrl ?? "./main-poster.jpeg"}
              preload="metadata"
              ref={videoRef}
              src={videoUrl}
              variants={videoVariants}
            >
              {/* Captions are open-captioned (burned into the video). */}
              <track kind="captions" />
            </motion.video>
          ) : (
            remotionPlayer
          )}
          <VideoControls
            captionCues={captionCues}
            captionsVisible={false}
            isRemotion={showRemotionPlayer}
            isVisible={shouldShowControls}
            key={`${mediaAssetKey}-controls`}
            onControlPress={handleControlPress}
            playerRef={playerRef}
            posterUrl={posterUrl}
            videoRef={videoRef}
          />
        </div>
      </div>
    </div>
  );
}
