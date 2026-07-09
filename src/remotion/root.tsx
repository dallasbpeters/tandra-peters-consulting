import { Composition } from "remotion";

import { AdsCompositions } from "./ads/ads-compositions";
import { TandraIntro } from "./tandra-intro";
import { tandraIntroSchema } from "./tandra-intro-schema";
import { WHITEBOARD_DEFAULTS } from "./whiteboard/whiteboard-defaults";
import { whiteboardVideoSchema } from "./whiteboard/whiteboard-schema";
import { WhiteboardVideo } from "./whiteboard/whiteboard-video";

/**
 * Editable copy for Remotion Studio (props panel writes here on save).
 * Remotion requires an inline object literal on `defaultProps`.
 *
 * Production renders ignore this — `pnpm video:render` passes Sanity copy via `--props`.
 * To pull CMS copy into Studio: `pnpm video:sync-copy`, then restart Studio.
 */
export const RemotionRoot = () => (
  <>
    <Composition
      component={TandraIntro}
      defaultProps={{
        content: {
          closing: {
            cta: "Schedule a free consultation",
            kicker: "Tandra Peters · Austin roofing consultant",
            line1: "Your roof,",
            line2: "handled right.",
          },
          inspection: {
            body: "You get the real condition of your roof, what matters now, and what can wait.",
            kicker: "On your roof",
            line1: "Inspect.",
            line2: "Document.",
            line3: "Explain.",
          },
          managed: {
            items: [
              "Claim guidance",
              "Paperwork review",
              "Birdcreek Roofing crews",
              "Final walkthrough",
            ],
            kicker: "What homeowners need",
            line1: "Professionalism.",
            line2: "Highest Quality Materials.",
            line3: "Unparalleled customer service.",
          },
          proof: {
            items: ["Roof assessments", "Insurance help", "Project oversight"],
            kicker: "Built for Austin-area homeowners",
            line1: "Local roof know-how.",
            line2: "Backed by Birdcreek.",
          },
          storm: {
            body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
            kicker: "Austin Homeowners",
            line1: "Austin roofs",
            line2: "take a beating.",
          },
          straightAnswers: {
            kicker: "Why Tandra?",
            line1: "Honest",
            line2: "answers.",
            line3: "No pressure.",
            quote: "If your roof just needs a repair, I'll tell you that.",
          },
        },
        showCaptions: false,
      }}
      durationInFrames={900}
      fps={30}
      height={1080}
      id="tandra-intro"
      schema={tandraIntroSchema}
      width={1920}
    />
    <AdsCompositions />
    <Composition
      component={WhiteboardVideo}
      defaultProps={WHITEBOARD_DEFAULTS}
      durationInFrames={900}
      fps={30}
      height={1080}
      id="whiteboard-explainer"
      schema={whiteboardVideoSchema}
      width={1920}
    />
  </>
);
