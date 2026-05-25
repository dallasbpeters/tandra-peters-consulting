import { Composition } from "remotion";
import { TandraIntro } from "./TandraIntro";
import { tandraIntroSchema } from "./tandraIntroContent";

export const RemotionRoot = () => {
  return (
    <Composition
      id="TandraIntro"
      component={TandraIntro}
      schema={tandraIntroSchema}
      defaultProps={{
        content: {
          storm: {
            kicker: "Austin homeowners",
            line1: "Texas roofs",
            line2: "take a beating.",
            body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
          },
          straightAnswers: {
            kicker: "Why Tandra?",
            line1: "Straight",
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
            line1: "Experience and Professionalism",
            line2: "High-Quality Materials",
            line3: "Exceptional Customer Service",
            items: [
              "Insurance claim guidance",
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
            cta: "Call or text 512-968-3965",
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
