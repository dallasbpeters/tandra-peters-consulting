import { Pause, Play } from "iconoir-react";
import { motion } from "motion/react";
import type { SyntheticEvent } from "react";

interface Props {
  isPlaying: boolean;
  isVisible: boolean;
  onPress: (event: SyntheticEvent) => void;
}

export const PlayPauseButton = ({ isPlaying, isVisible, onPress }: Props) => (
  <motion.button
    animate={{
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? "auto" : "none",
      scale: isVisible ? 1 : 0.9,
    }}
    aria-label={isPlaying ? "Pause featured video" : "Play featured video"}
    aria-pressed={isPlaying}
    className="featured-video__play"
    initial={false}
    onClick={onPress}
    type="button"
    whileHover={isVisible ? { scale: 1.05 } : undefined}
    whileTap={{ scale: 0.95 }}
  >
    {isPlaying ? (
      <Pause className="size-6" fill="currentColor" />
    ) : (
      <Play className="size-6" fill="currentColor" />
    )}
  </motion.button>
);
