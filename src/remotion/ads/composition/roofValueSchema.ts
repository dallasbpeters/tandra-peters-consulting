import { z } from "zod";

import { IMAGE_OPTIONS } from "./images";

export const roofValueSchema = z.object({
  hook: z.object({
    eyebrow: z.string().default("Your Home · Your Investment"),
    headline: z.string().default("A new roof\nisn't just\ncurb appeal."),
    sub: z.string().default("It's one of the best\ninvestments you can make."),
    image: z.enum(IMAGE_OPTIONS).default("photo-8.png"),
  }),
  simple: z.object({
    headline: z.string().default("Free Inspection."),
    body: z.string().default("Simple Body").optional(),
    showPill: z.boolean().default(true),
    pill: z.string().default("No cost. No pressure."),
    /** Pick from the dropdown — add new filenames to composition/images.ts */
    image: z.enum(IMAGE_OPTIONS).default("photo-13.jpeg"),
  }),
  benefits: z.object({
    lead: z.string().default("Better"),
    item1: z.string().default("Energy efficiency."),
    item2: z.string().default("Protection."),
    item3: z.string().default("Peace of mind."),
  }),
  intro: z.object({
    name: z.string().default("I'm Tandra Peters."),
    tagline: z.string().default("I help Austin-area homeowners navigate\nthe whole process."),
    detail: z.string().default("First inspection through\nthe final walkthrough."),
    showProfilePhoto: z.boolean().default(true),
    profilePhoto: z.object({
      src: z
        .string()
        .default("https://ik.imagekit.io/dtunrco/s5XsZe886hARc_iaJT_n2kz1BkFVjRKivgATP9bAOQA.png"),
      width: z.number().default(260),
      height: z.number().default(260),
    }),
  }),
  trust: z.object({
    hueShift: z.number().default(180),
    style: z.number().default(5),
    line1: z.string().default("No surprises."),
    line2: z.string().default("No pressure."),
  }),
  cta: z.object({
    setup: z.string().default("If you've been putting it off —"),
    punch: z.string().default("let's just\nget it done."),
    action: z.string().default("Reach out. I'll come take a look."),
    badge: z.string().default("Free · No pressure"),
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
  }),
  logoAnimation: z.object({
    text: z.string().default("Logo Animation"),
  }),

  /** Certification badges — shown in the CTA scene. */
  badges: z.object({
    show: z.boolean().default(true),
    gafMasterElite: z.boolean().default(true),
    ikoRoofSelect: z.boolean().default(true),
    rcatMember: z.boolean().default(true),
    rsraCommittee: z.boolean().default(false),
    tamkoPro: z.boolean().default(true),
  }),
});

export type RoofValueProps = z.infer<typeof roofValueSchema>;
