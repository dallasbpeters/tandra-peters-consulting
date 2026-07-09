/**
 * Central registry of every Remotion composition exposed to the in-browser
 * preview (`/remotion-preview`), the Sanity Studio "Videos" tool, and the
 * `/api/render-*` render endpoints. Keep this list in sync with
 * `src/remotion/root.tsx` (the Remotion bundle's composition registry).
 */
import type { ComponentType } from "react";

import {
  CUSTOM_SLOTS_DEFAULTS,
  HELPING_TEXAS_DEFAULTS,
  ROOF_SCENE_DEFAULTS,
  ROOF_VALUE_DEFAULTS,
  STORM_SPOT_DEFAULTS,
} from "./ads/ad-defaults";
import { TandraRoofValue, TandraStormSpot } from "./ads/clips";
import { CustomSlots } from "./ads/custom-composition";
import { RoofScene } from "./ads/roof-scene";
import { TandraIntro } from "./tandra-intro";
import {
  defaultTandraIntroContent,
  TANDRA_INTRO_DURATION_IN_FRAMES,
  TANDRA_INTRO_FPS,
} from "./tandra-intro-content";
import {
  WHITEBOARD_DEFAULTS,
  WHITEBOARD_DURATION_IN_FRAMES,
  WHITEBOARD_FPS,
} from "./whiteboard/whiteboard-defaults";
import { WhiteboardVideo } from "./whiteboard/whiteboard-video";

export type CompositionId =
  | "tandra-intro"
  | "TandraStormSpot"
  | "TandraRoofValue"
  | "roof-scene"
  | "CustomSlots"
  | "HelpingTexasHomeowners"
  | "whiteboard-explainer";

export interface CompositionEntry {
  /** Aspect-ratio string for the Player wrapper. */
  aspectRatio: string;
  component: ComponentType<Record<string, unknown>>;
  /** Default input props used for preview when no live copy is available. */
  defaultProps: Record<string, unknown>;
  /** Short description for the picker. */
  description: string;
  durationInFrames: number;
  fps: number;
  height: number;
  id: CompositionId;
  /** Human label shown in the Studio picker. */
  label: string;
  /** Frame shown when the in-browser player first loads. */
  previewFrame?: number;
  /**
   * When set, the preview merges live Sanity copy from this homePage object
   * field into the input props. Only `TandraIntro` is CMS-backed today.
   */
  sanityField?: "tandraIntroVideo";
  width: number;
}

const ratio = (w: number, h: number): string => `${w} / ${h}`;

export const COMPOSITIONS: CompositionEntry[] = [
  {
    aspectRatio: ratio(1920, 1080),
    component: TandraIntro,
    defaultProps: { content: defaultTandraIntroContent, showCaptions: false },
    description: "30-second 16:9 intro video that plays on the home page hero.",
    durationInFrames: TANDRA_INTRO_DURATION_IN_FRAMES,
    fps: TANDRA_INTRO_FPS,
    height: 1080,
    id: "tandra-intro",
    label: "Homepage intro",
    previewFrame: TANDRA_INTRO_FPS,
    sanityField: "tandraIntroVideo",
    width: 1920,
  },
  {
    aspectRatio: ratio(1080, 1350),
    component: TandraStormSpot,
    defaultProps: STORM_SPOT_DEFAULTS,
    description: "Vertical 4:5 storm-damage / insurance-claim social ad.",
    durationInFrames: 870,
    fps: 30,
    height: 1350,
    id: "TandraStormSpot",
    label: "Storm spot (9:16-ish)",
    width: 1080,
  },
  {
    aspectRatio: ratio(1080, 1350),
    component: TandraRoofValue,
    defaultProps: ROOF_VALUE_DEFAULTS,
    description: "Vertical 4:5 roof-investment / free-inspection social ad.",
    durationInFrames: 1260,
    fps: 30,
    height: 1350,
    id: "TandraRoofValue",
    label: "Roof value",
    width: 1080,
  },
  {
    aspectRatio: ratio(1080, 1350),
    component: RoofScene,
    defaultProps: ROOF_SCENE_DEFAULTS,

    description: "Vertical 4:5 animated 3D roof walkthrough (heavier preview).",
    // RoofScene uses calculateMetadata; this is the default-props duration.
    durationInFrames: 7 * 12 * 30 + 4 * 30 + 12 * 30,
    fps: 30,
    height: 1350,
    id: "roof-scene",
    label: "3D roof inspection",
    width: 1080,
  },
  {
    aspectRatio: ratio(1080, 1350),
    component: CustomSlots,
    defaultProps: CUSTOM_SLOTS_DEFAULTS,
    description: "Vertical 4:5 multi-scene assembler (roof damage tips + CTA).",
    durationInFrames: 7 * 180,
    fps: 30,
    height: 1350,
    id: "CustomSlots",
    label: "Custom slots",
    width: 1080,
  },
  {
    aspectRatio: ratio(1080, 1350),
    component: CustomSlots,
    defaultProps: HELPING_TEXAS_DEFAULTS,
    description:
      "Vertical 4:5 multi-scene assembler with the helping-homeowners intro.",
    durationInFrames: 7 * 180,
    fps: 30,
    height: 1350,
    id: "HelpingTexasHomeowners",
    label: "Helping Texas homeowners",
    width: 1080,
  },
  {
    aspectRatio: ratio(1920, 1080),
    component: WhiteboardVideo as ComponentType<Record<string, unknown>>,
    defaultProps: WHITEBOARD_DEFAULTS,
    description:
      "16:9 whiteboard explainer video with SVG draw-on animations. Configurable scenes: title, bullets, callout, diagram, and CTA.",
    durationInFrames: WHITEBOARD_DURATION_IN_FRAMES,
    fps: WHITEBOARD_FPS,
    height: 1080,
    id: "whiteboard-explainer",
    label: "Whiteboard explainer",
    width: 1920,
  },
];

const COMPOSITION_ALIASES: Record<string, CompositionId> = {
  RoofScene: "roof-scene",
  TandraIntro: "tandra-intro",
};

export const getComposition = (id: string): CompositionEntry | undefined => {
  const normalizedId = COMPOSITION_ALIASES[id] ?? id;
  return COMPOSITIONS.find((c) => c.id === normalizedId);
};
