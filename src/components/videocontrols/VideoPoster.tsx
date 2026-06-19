import type { SyntheticEvent } from "react";

interface Props {
  onPress: (event: SyntheticEvent) => void;
  posterUrl: string;
}

export const VideoPoster = ({ posterUrl, onPress }: Props) => (
  <button
    aria-label="Play featured video"
    className="featured-video__poster"
    onClick={onPress}
    type="button"
  >
    {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS */}
    <img alt="" className="featured-video__poster-image" src={posterUrl} />
  </button>
);
