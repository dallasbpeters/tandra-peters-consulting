import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import { theme } from "../../theme";

interface Props {
  isDragging: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  progress: number;
  progressPercent: number;
  trackRef: RefObject<HTMLDivElement | null>;
}

export const SeekBar = ({
  progress,
  progressPercent,
  isDragging,
  trackRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: Props) => (
  <div className="featured-video__progress">
    <div
      aria-label="Seek video"
      aria-orientation="horizontal"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progressPercent}
      aria-valuetext={`${progressPercent}% played`}
      className="featured-video__progress-hit"
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="slider"
      tabIndex={0}
    >
      <span className="featured-video__progress-track" ref={trackRef}>
        <span
          className={`featured-video__progress-fill${
            isDragging ? "featured-video__progress-fill--dragging" : ""
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
