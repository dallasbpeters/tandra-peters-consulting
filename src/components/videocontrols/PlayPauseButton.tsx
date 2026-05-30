import { Pause, Play } from "iconoir-react";
import { motion } from "motion/react";
import type { SyntheticEvent } from "react";

type Props = {
  isPlaying: boolean;
  isVisible: boolean;
  onPress: (event: SyntheticEvent) => void;
};

export const PlayPauseButton = ({ isPlaying, isVisible, onPress }: Props) => {
  return (
    <motion.button
      type="button"
      className="featured-video__play"
      aria-label={isPlaying ? "Pause featured video" : "Play featured video"}
      aria-pressed={isPlaying}
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.9,
        pointerEvents: isVisible ? "auto" : "none",
      }}
      whileTap={{ scale: 0.95 }}
      whileHover={isVisible ? { scale: 1.05 } : undefined}
      onClick={onPress}
    >
      {isPlaying ? (
        <Pause fill="currentColor" className="size-6" />
      ) : (
        <Play fill="currentColor" className="size-6" />
      )}
    </motion.button>
  );
};
