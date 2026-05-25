import React, { useCallback, useEffect, useRef, useState } from "react";
import { Halftone, Shader, SolidColor, Swirl } from "shaders/react";
import { motion, useInView, Variants } from "motion/react";
import { Play, Pause } from "iconoir-react";

interface Props {
  videoUrl: string;
  title?: string;
  posterUrl?: string;
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

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  maxWidth: "100%",
  aspectRatio: "16/9",
  objectFit: "contain",
  position: "relative",
  zIndex: 10,
  borderRadius: "1rem",
  contain: "paint",
};

const mediaSurfaceStyle: React.CSSProperties = {
  position: "relative",
  width: "min(95vw, 1200px)",
  maxWidth: 1200,
  zIndex: 10,
};

const controlsStyle: React.CSSProperties = {
  position: "absolute",
  right: "clamp(0.75rem, 2.5vw, 1.5rem)",
  bottom: "clamp(0.75rem, 2.5vw, 1.5rem)",
  transform: "none",
  zIndex: 20,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  blockSize: "clamp(4rem, 8vw, 5.25rem)",
  inlineSize: "clamp(4rem, 8vw, 5.25rem)",
  padding: "0.75rem 1.25rem",
  border: "1px solid rgba(255, 255, 255, 0.7)",
  borderRadius: 999,
  background: "rgba(4, 28, 19, 0.8)",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
  cursor: "pointer",
};

export function FeaturedVideoSection({ videoUrl, posterUrl }: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [hideControlsUntilMouseLeave, setHideControlsUntilMouseLeave] =
    useState(false);
  const isInView = useInView(sectionRef, { once: true, amount: 0.45 });

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

  const handleTogglePlay = useCallback(async () => {
    const node = videoRef.current;
    if (!node) return;

    if (node.paused || node.ended) {
      try {
        await node.play();
        setIsPlaying(true);
      } catch {
        // Fallback for browsers that still block initial play attempts.
        try {
          node.muted = true;
          await node.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
      return;
    }

    node.pause();
    setIsPlaying(false);
  }, []);

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
        <SolidColor color="#041c13" />
        <Halftone angle={0} frequency={135}>
          <Swirl colorA="#1d1438" colorB="#4d2c63" />
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
        <motion.video
          variants={videoVariants}
          initial="offscreen"
          animate={isInView ? "onscreen" : "offscreen"}
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          playsInline
          poster={posterUrl}
          controls={false}
          onPlay={() => {
            setIsPlaying(true);
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          style={videoStyle}
        />

        <motion.button
          type="button"
          aria-label={
            isPlaying ? "Pause featured video" : "Play featured video"
          }
          aria-pressed={isPlaying}
          initial={false}
          animate={{
            opacity: shouldShowControls ? 1 : 0,
            scale: shouldShowControls ? 1 : 0.9,
            pointerEvents: shouldShowControls ? "auto" : "none",
          }}
          whileTap={{ scale: 0.95 }}
          whileHover={shouldShowControls ? { scale: 1.05 } : undefined}
          onClick={() => {
            void handleTogglePlay();
            if (!isMobileDevice) {
              setHideControlsUntilMouseLeave(true);
            }
          }}
          style={controlsStyle}
        >
          {isPlaying ? (
            <Pause fill="currentColor" className="size-6" />
          ) : (
            <Play fill="currentColor" className="size-6" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
