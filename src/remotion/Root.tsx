import { Composition } from "remotion";

import { TandraIntro } from "./TandraIntro";
import { tandraIntroSchema } from "./tandraIntroContent";

/**
 * Editable copy for Remotion Studio (props panel writes here on save).
 * Remotion requires an inline object literal on `defaultProps`.
 *
 * Production renders ignore this — `pnpm video:render` passes Sanity copy via `--props`.
 * To pull CMS copy into Studio: `pnpm video:sync-copy`, then restart Studio.
 */
export const RemotionRoot = () => {
  return (
    <Composition
      id="TandraIntro"
      component={TandraIntro}
      schema={tandraIntroSchema}
      defaultProps={{
        content: {
          storm: {
            kicker: "Austin Homeowners",
            line1: "Austin roofs",
            line2: "take a beating.",
            body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
          },
          straightAnswers: {
            kicker: "Why Tandra?",
            line1: "Honest",
            line2: "answers.",
            line3: "No pressure.",
            quote: "If your roof just needs a repair, I'll tell you that.",
          },
          inspection: {
            kicker: "On your roof",
            line1: "Inspect.",
            line2: "Document.",
            line3: "Explain.",
            body: "You get the real condition of your roof, what matters now, and what can wait.",
          },
          managed: {
            kicker: "What homeowners need",
            line1: "Professionalism.",
            line2: "Highest Quality Materials.",
            line3: "Unparalleled customer service.",
            items: [
              "Claim guidance",
              "Paperwork review",
              "Birdcreek Roofing crews",
              "Final walkthrough",
            ],
          },
          proof: {
            kicker: "Built for Austin-area homeowners",
            line1: "Local roof know-how.",
            line2: "Backed by Birdcreek.",
            items: ["Roof assessments", "Insurance help", "Project oversight"],
          },
          closing: {
            kicker: "Tandra Peters · Austin roofing consultant",
            line1: "Your roof,",
            line2: "handled right.",
            cta: "Schedule a free consultation",
          },
        },
      }}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
