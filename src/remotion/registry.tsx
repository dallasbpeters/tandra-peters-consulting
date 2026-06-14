/**
 * Central registry of every Remotion composition exposed to the in-browser
 * preview (`/remotion-preview`), the Sanity Studio "Videos" tool, and the
 * `/api/render-*` render endpoints. Keep this list in sync with
 * `src/remotion/Root.tsx` (the Remotion bundle's composition registry).
 */
import type { ComponentType } from "react";

import {
  CUSTOM_SLOTS_DEFAULTS,
  HELPING_TEXAS_DEFAULTS,
  ROOF_SCENE_DEFAULTS,
  ROOF_VALUE_DEFAULTS,
  STORM_SPOT_DEFAULTS,
} from "./ads/adDefaults";
import { TandraRoofValue, TandraStormSpot } from "./ads/Clips";
import { CustomSlots } from "./ads/CustomComposition";
import { RoofScene } from "./ads/RoofScene";
import { TandraIntro } from "./TandraIntro";
import {
  defaultTandraIntroContent,
  TANDRA_INTRO_DURATION_IN_FRAMES,
  TANDRA_INTRO_FPS,
} from "./tandraIntroContent";

export type CompositionId =
  | "TandraIntro"
  | "TandraStormSpot"
  | "TandraRoofValue"
  | "RoofScene"
  | "CustomSlots"
  | "HelpingTexasHomeowners";

export type CompositionEntry = {
  id: CompositionId;
  /** Human label shown in the Studio picker. */
  label: string;
  /** Short description for the picker. */
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** Aspect-ratio string for the Player wrapper. */
  aspectRatio: string;
  /** Default input props used for preview when no live copy is available. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultProps: Record<string, any>;
  /**
   * When set, the preview merges live Sanity copy from this homePage object
   * field into the input props. Only `TandraIntro` is CMS-backed today.
   */
  sanityField?: "tandraIntroVideo";
};

const ratio = (w: number, h: number): string => `${w} / ${h}`;

export const COMPOSITIONS: CompositionEntry[] = [
  {
    id: "TandraIntro",
    label: "Homepage intro",
    description: "30-second 16:9 intro video that plays on the home page hero.",
    component: TandraIntro,
    width: 1920,
    height: 1080,
    fps: TANDRA_INTRO_FPS,
    durationInFrames: TANDRA_INTRO_DURATION_IN_FRAMES,
    aspectRatio: ratio(1920, 1080),
    defaultProps: { content: defaultTandraIntroContent },
    sanityField: "tandraIntroVideo",
  },
  {
    id: "TandraStormSpot",
    label: "Storm spot (9:16-ish)",
    description: "Vertical 4:5 storm-damage / insurance-claim social ad.",
    component: TandraStormSpot,
    width: 1080,
    height: 1350,
    fps: 30,
    durationInFrames: 870,
    aspectRatio: ratio(1080, 1350),
    defaultProps: STORM_SPOT_DEFAULTS,
  },
  {
    id: "TandraRoofValue",
    label: "Roof value",
    description: "Vertical 4:5 roof-investment / free-inspection social ad.",
    component: TandraRoofValue,
    width: 1080,
    height: 1350,
    fps: 30,
    durationInFrames: 1260,
    aspectRatio: ratio(1080, 1350),
    defaultProps: ROOF_VALUE_DEFAULTS,
  },
  {
    id: "RoofScene",
    label: "3D roof inspection",
    description: "Vertical 4:5 animated 3D roof walkthrough (heavier preview).",
    component: RoofScene,
    width: 1080,
    height: 1350,
    fps: 30,
    // RoofScene uses calculateMetadata; this is the default-props duration.
    durationInFrames: 7 * 12 * 30 + 4 * 30 + 12 * 30,
    aspectRatio: ratio(1080, 1350),
    defaultProps: ROOF_SCENE_DEFAULTS,
  },
  {
    id: "CustomSlots",
    label: "Custom slots",
    description: "Vertical 4:5 multi-scene assembler (roof damage tips + CTA).",
    component: CustomSlots,
    width: 1080,
    height: 1350,
    fps: 30,
    durationInFrames: 7 * 180,
    aspectRatio: ratio(1080, 1350),
    defaultProps: CUSTOM_SLOTS_DEFAULTS,
  },
  {
    id: "HelpingTexasHomeowners",
    label: "Helping Texas homeowners",
    description: "Vertical 4:5 multi-scene assembler with the helping-homeowners intro.",
    component: CustomSlots,
    width: 1080,
    height: 1350,
    fps: 30,
    durationInFrames: 7 * 180,
    aspectRatio: ratio(1080, 1350),
    defaultProps: HELPING_TEXAS_DEFAULTS,
  },
];

export const getComposition = (id: string): CompositionEntry | undefined =>
  COMPOSITIONS.find((c) => c.id === id);
