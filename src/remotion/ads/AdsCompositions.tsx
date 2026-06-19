import { Composition } from "remotion";

import {
  CUSTOM_SLOTS_DEFAULTS,
  HELPING_TEXAS_DEFAULTS,
  ROOF_SCENE_DEFAULTS,
  ROOF_VALUE_DEFAULTS,
  STORM_SPOT_DEFAULTS,
} from "./adDefaults";
import { TandraRoofValue, TandraStormSpot } from "./Clips";
import { CustomSlots } from "./CustomComposition";
import { customCompositionSchema } from "./composition/customSchema";
import { roofSceneSchema } from "./composition/roofSceneSchema";
import { roofValueSchema } from "./composition/roofValueSchema";
import { stormSpotSchema } from "./composition/stormSpotSchema";
import { calculateMetadata } from "./customCalculateMetadata";
import { RoofScene } from "./RoofScene";
import { roofSceneCalculateMetadata } from "./roofSceneCalculateMetadata";

/**
 * Social-ad Remotion compositions ported from the standalone `remotion-tandra`
 * project. All are vertical 1080×1350 (4:5) at 30fps. Registered alongside the
 * 16:9 `TandraIntro` homepage composition in `../Root.tsx`.
 *
 * Default props are shared with the preview/Studio picker via `./adDefaults`.
 * Assets resolve from `public/ads/` (see `adsFile` in `Clips.tsx`); `roof.glb`
 * is shared at the public root.
 */
export const AdsCompositions = () => (
  <>
    <Composition
      calculateMetadata={roofSceneCalculateMetadata}
      component={RoofScene}
      defaultProps={ROOF_SCENE_DEFAULTS}
      height={1350}
      id="RoofScene"
      schema={roofSceneSchema}
      width={1080}
    />
    <Composition
      component={TandraRoofValue}
      defaultProps={ROOF_VALUE_DEFAULTS}
      durationInFrames={1260}
      fps={30}
      height={1350}
      id="TandraRoofValue"
      schema={roofValueSchema}
      width={1080}
    />
    <Composition
      component={TandraStormSpot}
      defaultProps={STORM_SPOT_DEFAULTS}
      durationInFrames={870}
      fps={30}
      height={1350}
      id="TandraStormSpot"
      schema={stormSpotSchema}
      width={1080}
    />
    <Composition
      calculateMetadata={calculateMetadata}
      component={CustomSlots}
      defaultProps={CUSTOM_SLOTS_DEFAULTS}
      durationInFrames={750}
      fps={30}
      height={1350}
      id="CustomSlots"
      schema={customCompositionSchema}
      width={1080}
    />
    <Composition
      calculateMetadata={calculateMetadata}
      component={CustomSlots}
      defaultProps={HELPING_TEXAS_DEFAULTS}
      durationInFrames={750}
      fps={30}
      height={1350}
      id="HelpingTexasHomeowners"
      schema={customCompositionSchema}
      width={1080}
    />
  </>
);
