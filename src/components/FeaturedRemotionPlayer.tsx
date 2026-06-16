import { Player, type PlayerRef } from "@remotion/player";
import { forwardRef, memo, useMemo } from "react";

import type { TandraIntroContent } from "../remotion/tandraIntroContent";

import { TandraIntro } from "../remotion/TandraIntro";
import { TANDRA_INTRO_DURATION_IN_FRAMES, TANDRA_INTRO_FPS } from "../remotion/tandraIntroContent";

type Props = {
  content: TandraIntroContent;
  posterUrl?: string;
  showCaptions: boolean;
};

export const FeaturedRemotionPlayer = memo(
  forwardRef<PlayerRef, Props>(({ content, posterUrl, showCaptions }, ref) => {
    const inputProps = useMemo(() => ({ content, showCaptions }), [content, showCaptions]);
    const renderPoster = useMemo(
      () =>
        posterUrl
          ? () => <img alt="" className="featured-video__poster-image" src={posterUrl} />
          : undefined,
      [posterUrl],
    );

    return (
      <Player
        ref={ref}
        component={TandraIntro}
        durationInFrames={TANDRA_INTRO_DURATION_IN_FRAMES}
        compositionWidth={1906}
        compositionHeight={1072}
        fps={TANDRA_INTRO_FPS}
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
