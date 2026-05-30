import type { SyntheticEvent } from "react";

type Props = {
  posterUrl: string;
  onPress: (event: SyntheticEvent) => void;
};

export const VideoPoster = ({ posterUrl, onPress }: Props) => {
  return (
    <button
      type="button"
      className="featured-video__poster"
      aria-label="Play featured video"
      onClick={onPress}
    >
      <img alt="" className="featured-video__poster-image" src={posterUrl} />
    </button>
  );
};
