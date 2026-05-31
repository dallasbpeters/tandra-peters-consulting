import { zTextarea } from "@remotion/zod-types";
import { z } from "zod";

const shortText = z.string();
const bodyText = zTextarea();

const twoLineSceneSchema = z.object({
  kicker: shortText,
  line1: shortText,
  line2: shortText,
});

const threeLineSceneSchema = twoLineSceneSchema.extend({
  line3: shortText,
});

export const tandraIntroSchema = z.object({
  content: z.object({
    storm: twoLineSceneSchema.extend({
      body: bodyText,
    }),
    straightAnswers: threeLineSceneSchema.extend({
      quote: bodyText,
    }),
    inspection: threeLineSceneSchema.extend({
      body: bodyText,
    }),
    managed: threeLineSceneSchema.extend({
      items: z.array(shortText).min(1).max(4),
    }),
    proof: twoLineSceneSchema.extend({
      items: z.array(shortText).min(1).max(3),
    }),
    closing: twoLineSceneSchema.extend({
      cta: shortText,
    }),
  }),
});

export type TandraIntroContent = {
  storm: {
    kicker: string;
    line1: string;
    line2: string;
    body: string;
  };
  straightAnswers: {
    kicker: string;
    line1: string;
    line2: string;
    line3: string;
    quote: string;
  };
  inspection: {
    kicker: string;
    line1: string;
    line2: string;
    line3: string;
    body: string;
  };
  managed: {
    kicker: string;
    line1: string;
    line2: string;
    line3: string;
    items: string[];
  };
  proof: {
    kicker: string;
    line1: string;
    line2: string;
    items: string[];
  };
  closing: {
    kicker: string;
    line1: string;
    line2: string;
    cta: string;
  };
};

export type TandraIntroProps = z.infer<typeof tandraIntroSchema>;

export const defaultTandraIntroContent: TandraIntroContent = {
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
    line1: "EXPERIENCE AND PROFESSIONALISM",
    line2: "HIGH-QUALITY MATERIALS",
    line3: "Exceptional Customer Service",
    items: ["Claim guidance", "Paperwork review", "Birdcreek crews", "Final walkthrough"],
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
};
