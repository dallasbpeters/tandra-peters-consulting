import { forwardRef, memo, useMemo } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { TandraIntro } from "../remotion/TandraIntro";
import type { TandraIntroContent } from "../remotion/tandraIntroContent";

type Props = {
  content: TandraIntroContent;
  posterUrl?: string;
};

const REMOTION_FPS = 30;
export const REMOTION_DURATION_IN_FRAMES = 900;
export const REMOTION_DURATION_SECONDS =
  REMOTION_DURATION_IN_FRAMES / REMOTION_FPS;

export const FeaturedRemotionPlayer = memo(
  forwardRef<PlayerRef, Props>(({ content, posterUrl }, ref) => {
    const inputProps = useMemo(() => ({ content }), [content]);
    const renderPoster = useMemo(
      () =>
        posterUrl
          ? () => (
              <img
                alt=""
                className="featured-video__poster-image"
                src={posterUrl}
              />
            )
          : undefined,
      [posterUrl],
    );

    return (
      <Player
        ref={ref}
        component={TandraIntro}
        durationInFrames={REMOTION_DURATION_IN_FRAMES}
        compositionWidth={1906}
        compositionHeight={1072}
        fps={REMOTION_FPS}
        controls={false}
        clickToPlay={false}
        acknowledgeRemotionLicense
        showPosterWhenUnplayed={Boolean(posterUrl)}
        renderPoster={renderPoster}
        inputProps={inputProps}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
        }}
      />
    );
  }),
);

FeaturedRemotionPlayer.displayName = "FeaturedRemotionPlayer";
