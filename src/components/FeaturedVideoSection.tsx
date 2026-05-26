import React, { useCallback, useEffect, useRef, useState } from "react";
import { Halftone, Shader, SolidColor, Swirl } from "shaders/react";
import { motion, useInView, type Variants } from "motion/react";
import { Play, Pause } from "iconoir-react";
import { theme } from "../theme";

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

const mediaSurfaceStyle: React.CSSProperties = {
  position: "relative",
  width: "min(95vw, 1200px)",
  maxWidth: 1200,
  zIndex: 10,
};

const clampRatio = (value: number) => Math.min(1, Math.max(0, value));

export function FeaturedVideoSection({ videoUrl, posterUrl }: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [hideControlsUntilMouseLeave, setHideControlsUntilMouseLeave] =
    useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const isInView = useInView(sectionRef, { once: true, amount: 0.45 });

  const progress =
    duration > 0 ? clampRatio(currentTime / duration) : 0;
  const progressPercent = Math.round(progress * 100);

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

  const syncPlaybackState = useCallback(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }

    setCurrentTime(node.currentTime);
    if (Number.isFinite(node.duration)) {
      setDuration(node.duration);
    }
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }

    const handleLoadedMetadata = () => {
      syncPlaybackState();
    };

    node.addEventListener("loadedmetadata", handleLoadedMetadata);
    node.addEventListener("durationchange", handleLoadedMetadata);
    node.addEventListener("timeupdate", syncPlaybackState);
    node.addEventListener("seeked", syncPlaybackState);
    node.addEventListener("ended", syncPlaybackState);

    return () => {
      node.removeEventListener("loadedmetadata", handleLoadedMetadata);
      node.removeEventListener("durationchange", handleLoadedMetadata);
      node.removeEventListener("timeupdate", syncPlaybackState);
      node.removeEventListener("seeked", syncPlaybackState);
      node.removeEventListener("ended", syncPlaybackState);
    };
  }, [syncPlaybackState, videoUrl]);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const node = videoRef.current;
      const track = progressTrackRef.current;
      if (!node || !track || duration <= 0) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const ratio = clampRatio((clientX - rect.left) / rect.width);
      node.currentTime = ratio * duration;
      setCurrentTime(node.currentTime);
    },
    [duration],
  );

  const handleProgressPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    setIsDraggingProgress(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handleProgressPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!isDraggingProgress) {
      return;
    }

    seekFromClientX(event.clientX);
  };

  const handleProgressPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!isDraggingProgress) {
      return;
    }

    setIsDraggingProgress(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleProgressKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const node = videoRef.current;
    if (!node || duration <= 0) {
      return;
    }

    const step = event.shiftKey ? 10 : 5;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      node.currentTime = Math.min(duration, node.currentTime + step);
      syncPlaybackState();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      node.currentTime = Math.max(0, node.currentTime - step);
      syncPlaybackState();
    } else if (event.key === "Home") {
      event.preventDefault();
      node.currentTime = 0;
      syncPlaybackState();
    } else if (event.key === "End") {
      event.preventDefault();
      node.currentTime = duration;
      syncPlaybackState();
    }
  };

  const handleTogglePlay = useCallback(async () => {
    const node = videoRef.current;
    if (!node) return;

    if (node.paused || node.ended) {
      try {
        await node.play();
        setIsPlaying(true);
      } catch {
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
        <div className="featured-video__frame">
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
            onPlay={() => {
              setIsPlaying(true);
            }}
            onPause={() => {
              setIsPlaying(false);
            }}
          />

          <div className="featured-video__progress">
            <button
              type="button"
              className="featured-video__progress-hit"
              aria-label="Seek video"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-valuetext={`${progressPercent}% played`}
              onPointerDown={handleProgressPointerDown}
              onPointerMove={handleProgressPointerMove}
              onPointerUp={handleProgressPointerUp}
              onPointerCancel={handleProgressPointerUp}
              onKeyDown={handleProgressKeyDown}
            >
              <span
                ref={progressTrackRef}
                className="featured-video__progress-track"
              >
                <span
                  className={`featured-video__progress-fill${isDraggingProgress ? " featured-video__progress-fill--dragging" : ""}`}
                  style={{
                    width: `${progress * 100}%`,
                    backgroundColor: theme.colors.heroAccent,
                  }}
                />
              </span>
            </button>
          </div>

          <motion.button
            type="button"
            className="featured-video__play"
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
          >
            {isPlaying ? (
              <Pause fill="currentColor" className="size-6" />
            ) : (
              <Play fill="currentColor" className="size-6" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
