import type { PlayerRef } from "@remotion/player";
import { Player } from "@remotion/player";
import { forwardRef, memo, useMemo } from "react";

import { TandraIntro } from "../remotion/tandra-intro";
import type { TandraIntroContent } from "../remotion/tandra-intro-content";
import {
  TANDRA_INTRO_DURATION_IN_FRAMES,
  TANDRA_INTRO_FPS,
} from "../remotion/tandra-intro-content";

interface Props {
  content: TandraIntroContent;
  posterUrl?: string;
  showCaptions: boolean;
}

export const FeaturedRemotionPlayer = memo(
  forwardRef<PlayerRef, Props>(({ content, posterUrl, showCaptions }, ref) => {
    const inputProps = useMemo(
      () => ({ content, showCaptions }),
      [content, showCaptions]
    );
    const renderPoster = useMemo(
      () =>
        posterUrl
          ? () => (
              // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
              <img
                alt=""
                className="featured-video__poster-image"
                src={posterUrl}
              />
            )
          : undefined,
      [posterUrl]
    );

    return (
      <Player
        acknowledgeRemotionLicense
        clickToPlay={false}
        component={TandraIntro}
        compositionHeight={1072}
        compositionWidth={1906}
        controls={false}
        durationInFrames={TANDRA_INTRO_DURATION_IN_FRAMES}
        fps={TANDRA_INTRO_FPS}
        inputProps={inputProps}
        ref={ref}
        renderPoster={renderPoster}
        showPosterWhenUnplayed={Boolean(posterUrl)}
        style={{
          aspectRatio: "16 / 9",
          width: "100%",
        }}
      />
    );
  })
);

FeaturedRemotionPlayer.displayName = "featured-remotion-player";
