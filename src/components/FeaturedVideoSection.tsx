import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import type { TandraIntroContent } from "../remotion/tandraIntroContent";
import { Halftone, Shader, SolidColor, Swirl } from "shaders/react";
import { motion, useInView, type Variants } from "motion/react";
import { FeaturedRemotionPlayer } from "./FeaturedRemotionPlayer";
import { VideoControls } from "./videocontrols";

interface Props {
  videoUrl?: string;
  title?: string;
  posterUrl?: string;
  introContent?: TandraIntroContent;
}

const containerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "2rem 1rem",
  display: "grid",
  placeContent: "center",
  placeItems: "center",
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
  const showRemotionPlayer = Boolean(introContent);

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

  return (
    <div ref={sectionRef} style={containerStyle}>
      <Shader style={shaderStyle}>
        <SolidColor color="#09291d" />
        <Halftone angle={0} frequency={135}>
          <Swirl colorA="#12533A" colorB="#7f65cd" />
        </Halftone>
      </Shader>

      <div
        style={mediaSurfaceStyle}
        onMouseEnter={() => {
          setIsHoveringVideo(true);
        }}
        onMouseLeave={() => {
          setIsHoveringVideo(false);
          setHideControlsUntilMouseLeave(false);
        }}
        onFocusCapture={() => {
          setIsHoveringVideo(true);
        }}
        onBlurCapture={() => {
          setIsHoveringVideo(false);
          setHideControlsUntilMouseLeave(false);
        }}
      >
        <div className="featured-video__frame">
          {introContent ? (
            <motion.div
              variants={videoVariants}
              initial="offscreen"
              animate={isInView ? "onscreen" : "offscreen"}
              className="featured-video__video featured-video__player"
            >
              <FeaturedRemotionPlayer
                ref={playerRef}
                content={introContent}
                posterUrl={posterUrl}
              />
            </motion.div>
          ) : videoUrl ? (
            <>
              <motion.video
                variants={videoVariants}
                initial="offscreen"
                animate={isInView ? "onscreen" : "offscreen"}
                ref={videoRef}
                className="featured-video__video"
                src={videoUrl}
                preload="metadata"
                playsInline
                poster={posterUrl}
                controls={false}
              />
            </>
          ) : null}
          <VideoControls
            videoRef={videoRef}
            playerRef={playerRef}
            isRemotion={showRemotionPlayer}
            posterUrl={posterUrl}
            isVisible={shouldShowControls}
            onControlPress={handleControlPress}
          />
        </div>
      </div>
    </div>
  );
}
