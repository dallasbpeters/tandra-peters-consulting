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
  showCaptions: z.boolean().default(false),
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
