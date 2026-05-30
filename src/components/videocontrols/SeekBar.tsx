import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { theme } from "../../theme";

type Props = {
  progress: number;
  progressPercent: number;
  isDragging: boolean;
  trackRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export const SeekBar = ({
  progress,
  progressPercent,
  isDragging,
  trackRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: Props) => {
  return (
    <div className="featured-video__progress">
      <div
        role="slider"
        tabIndex={0}
        className="featured-video__progress-hit"
        aria-label="Seek video"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-valuetext={`${progressPercent}% played`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <span ref={trackRef} className="featured-video__progress-track">
          <span
            className={`featured-video__progress-fill${
              isDragging ? " featured-video__progress-fill--dragging" : ""
            }`}
            style={{
              width: `${progress * 100}%`,
              backgroundColor: theme.colors.heroAccent,
            }}
          />
        </span>
      </div>
    </div>
  );
};
