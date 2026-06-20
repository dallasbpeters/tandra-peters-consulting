import type { PlayerRef } from "@remotion/player";
import {
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { CaptionCue } from "../../remotion/tandraIntroContent";
import {
  TANDRA_INTRO_DURATION_IN_FRAMES,
  TANDRA_INTRO_FPS,
} from "../../remotion/tandraIntroContent";
import { PlayPauseButton } from "./PlayPauseButton";
import { SeekBar } from "./SeekBar";
import { VideoPoster } from "./VideoPoster";

const REMOTION_DURATION_SECONDS =
  TANDRA_INTRO_DURATION_IN_FRAMES / TANDRA_INTRO_FPS;

interface Props {
  captionCues?: CaptionCue[];
  captionsVisible?: boolean;
  isRemotion: boolean;
  isVisible: boolean;
  onControlPress?: () => void;
  playerRef: React.RefObject<PlayerRef | null>;
  posterUrl?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const clampRatio = (value: number) => Math.min(1, Math.max(0, value));

export const VideoControls = ({
  videoRef,
  playerRef,
  isRemotion,
  posterUrl,
  captionsVisible,
  captionCues,
  isVisible,
  onControlPress,
}: Props) => {
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(
    isRemotion ? REMOTION_DURATION_SECONDS : 0
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const syncVideoPlaybackState = useCallback(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }

    setCurrentTime(node.currentTime);
    if (Number.isFinite(node.duration)) {
      setDuration(node.duration);
    }
    setIsPlaying(!(node.paused || node.ended));
  }, [videoRef]);

  useEffect(() => {
    if (!isRemotion) {
      return;
    }

    setDuration(REMOTION_DURATION_SECONDS);
    const player = playerRef.current;
    if (!player) {
      return;
    }

    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setCurrentTime(player.getCurrentFrame() / TANDRA_INTRO_FPS);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(REMOTION_DURATION_SECONDS);
    };
    const handleFrameUpdate = (event: { detail: { frame: number } }) => {
      setCurrentTime(event.detail.frame / TANDRA_INTRO_FPS);
    };

    setCurrentTime(player.getCurrentFrame() / TANDRA_INTRO_FPS);
    setIsPlaying(player.isPlaying());
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);
    player.addEventListener("timeupdate", handleFrameUpdate);
    player.addEventListener("seeked", handleFrameUpdate);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
      player.removeEventListener("timeupdate", handleFrameUpdate);
      player.removeEventListener("seeked", handleFrameUpdate);
    };
  }, [isRemotion, playerRef]);

  useEffect(() => {
    if (isRemotion) {
      return;
    }

    const node = videoRef.current;
    if (!node) {
      return;
    }

    node.addEventListener("loadedmetadata", syncVideoPlaybackState);
    node.addEventListener("durationchange", syncVideoPlaybackState);
    node.addEventListener("timeupdate", syncVideoPlaybackState);
    node.addEventListener("seeked", syncVideoPlaybackState);
    node.addEventListener("play", syncVideoPlaybackState);
    node.addEventListener("pause", syncVideoPlaybackState);
    node.addEventListener("ended", syncVideoPlaybackState);
    syncVideoPlaybackState();

    return () => {
      node.removeEventListener("loadedmetadata", syncVideoPlaybackState);
      node.removeEventListener("durationchange", syncVideoPlaybackState);
      node.removeEventListener("timeupdate", syncVideoPlaybackState);
      node.removeEventListener("seeked", syncVideoPlaybackState);
      node.removeEventListener("play", syncVideoPlaybackState);
      node.removeEventListener("pause", syncVideoPlaybackState);
      node.removeEventListener("ended", syncVideoPlaybackState);
    };
  }, [isRemotion, syncVideoPlaybackState, videoRef]);

  const seekToTime = useCallback(
    (time: number) => {
      const nextTime = Math.min(duration, Math.max(0, time));
      if (isRemotion) {
        playerRef.current?.seekTo(Math.round(nextTime * TANDRA_INTRO_FPS));
        setCurrentTime(nextTime);
        return;
      }

      const node = videoRef.current;
      if (!node) {
        return;
      }
      node.currentTime = nextTime;
      syncVideoPlaybackState();
    },
    [duration, isRemotion, playerRef, syncVideoPlaybackState, videoRef]
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = progressTrackRef.current;
      if (!track || duration <= 0) {
        return;
      }

      const rect = track.getBoundingClientRect();
      seekToTime(clampRatio((clientX - rect.left) / rect.width) * duration);
    },
    [duration, seekToTime]
  );

  const handleProgressPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingProgress(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handleProgressPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isDraggingProgress) {
      seekFromClientX(event.clientX);
    }
  };

  const handleProgressPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingProgress) {
      return;
    }

    setIsDraggingProgress(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleProgressKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) {
      return;
    }

    const step = event.shiftKey ? 10 : 5;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekToTime(currentTime + step);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekToTime(currentTime - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      seekToTime(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekToTime(duration);
    }
  };

  const handleTogglePlay = useCallback(
    async (event: SyntheticEvent) => {
      onControlPress?.();

      if (isRemotion) {
        playerRef.current?.toggle(event);
        return;
      }

      const node = videoRef.current;
      if (!node) {
        return;
      }

      if (node.paused || node.ended) {
        try {
          await node.play();
        } catch {
          node.muted = true;
          await node.play().catch(() => undefined);
        }
        syncVideoPlaybackState();
        return;
      }

      node.pause();
      syncVideoPlaybackState();
    },
    [isRemotion, onControlPress, playerRef, syncVideoPlaybackState, videoRef]
  );

  const showPoster = Boolean(posterUrl && !isPlaying && currentTime === 0);
  const controlsVisible = isVisible || showPoster;
  const progress = duration > 0 ? clampRatio(currentTime / duration) : 0;
  const progressPercent = Math.round(progress * 100);
  const activeCaption =
    captionsVisible && captionCues?.length
      ? captionCues.find(
          (cue) =>
            currentTime * TANDRA_INTRO_FPS >= cue.fromFrame &&
            currentTime * TANDRA_INTRO_FPS < cue.toFrame
        )
      : undefined;

  return (
    <>
      {showPoster && posterUrl ? (
        <VideoPoster onPress={handleTogglePlay} posterUrl={posterUrl} />
      ) : null}

      <SeekBar
        isDragging={isDraggingProgress}
        onKeyDown={handleProgressKeyDown}
        onPointerDown={handleProgressPointerDown}
        onPointerMove={handleProgressPointerMove}
        onPointerUp={handleProgressPointerUp}
        progress={progress}
        progressPercent={progressPercent}
        trackRef={progressTrackRef}
      />

      {activeCaption ? (
        <div aria-hidden="true" className="featured-video__captions-overlay">
          <p>{activeCaption.text}</p>
        </div>
      ) : null}

      <PlayPauseButton
        isPlaying={isPlaying}
        isVisible={controlsVisible}
        onPress={handleTogglePlay}
      />
    </>
  );
};
