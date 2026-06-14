import { Composition } from "remotion";

import {
  CUSTOM_SLOTS_DEFAULTS,
  HELPING_TEXAS_DEFAULTS,
  ROOF_SCENE_DEFAULTS,
  ROOF_VALUE_DEFAULTS,
  STORM_SPOT_DEFAULTS,
} from "./adDefaults";
import { TandraRoofValue, TandraStormSpot } from "./Clips";
import { customCompositionSchema } from "./composition/customSchema";
import { roofSceneSchema } from "./composition/roofSceneSchema";
import { roofValueSchema } from "./composition/roofValueSchema";
import { stormSpotSchema } from "./composition/stormSpotSchema";
import { calculateMetadata } from "./customCalculateMetadata";
import { CustomSlots } from "./CustomComposition";
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
      id="RoofScene"
      component={RoofScene}
      schema={roofSceneSchema}
      calculateMetadata={roofSceneCalculateMetadata}
      width={1080}
      height={1350}
      defaultProps={ROOF_SCENE_DEFAULTS}
    />
    <Composition
      id="TandraRoofValue"
      component={TandraRoofValue}
      schema={roofValueSchema}
      defaultProps={ROOF_VALUE_DEFAULTS}
      durationInFrames={1260}
      fps={30}
      width={1080}
      height={1350}
    />
    <Composition
      id="TandraStormSpot"
      component={TandraStormSpot}
      schema={stormSpotSchema}
      defaultProps={STORM_SPOT_DEFAULTS}
      durationInFrames={870}
      fps={30}
      width={1080}
      height={1350}
    />
    <Composition
      id="CustomSlots"
      component={CustomSlots}
      schema={customCompositionSchema}
      calculateMetadata={calculateMetadata}
      defaultProps={CUSTOM_SLOTS_DEFAULTS}
      fps={30}
      width={1080}
      height={1350}
      durationInFrames={750}
    />
    <Composition
      id="HelpingTexasHomeowners"
      component={CustomSlots}
      schema={customCompositionSchema}
      calculateMetadata={calculateMetadata}
      defaultProps={HELPING_TEXAS_DEFAULTS}
      fps={30}
      width={1080}
      height={1350}
      durationInFrames={750}
    />
  </>
);
