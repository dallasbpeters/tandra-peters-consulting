import type { CalculateMetadataFunction } from "remotion";

import type { RoofSceneProps } from "./composition/roof-scene-schema";
import { roofSceneSchema } from "./composition/roof-scene-schema";

export const roofSceneCalculateMetadata: CalculateMetadataFunction<
  RoofSceneProps
> = ({ props }) => {
  const p = roofSceneSchema.parse(props);
  const introFrames = Math.round(p.introSecs * 30);
  const chapterFrames = p.chapters.reduce(
    (sum, ch) => sum + (ch.skip ? 0 : Math.round(ch.durationSecs * 30)),
    0
  );
  const ctaFrames = Math.round(p.cta.durationSecs * 30);
  return {
    durationInFrames: Math.max(introFrames + chapterFrames + ctaFrames, 1),
    fps: 30,
  };
};
