import { z } from "zod";

import { IMAGE_OPTIONS } from "./images";

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-schemas reused across scene variants
// ─────────────────────────────────────────────────────────────────────────────

const badgesSchema = z.object({
  gafMasterElite: z.boolean().default(true),
  ikoRoofSelect: z.boolean().default(true),
  rcatMember: z.boolean().default(true),
  rsraCommittee: z.boolean().default(false),
  show: z.boolean().default(false),
  tamkoPro: z.boolean().default(true),
});

const profilePhotoSchema = z.object({
  height: z.number().default(260),
  src: z
    .string()
    .default(
      "https://ik.imagekit.io/dtunrco/s5XsZe886hARc_iaJT_n2kz1BkFVjRKivgATP9bAOQA.png"
    ),
  width: z.number().default(260),
});

// ─────────────────────────────────────────────────────────────────────────────

export const logoAnimationSchema = z.object({
  text: z.string().default("Logo Animation"),
});

// Scene variants
//
// Prefix convention:
//   rv-*  →  Roof Value scenes  (light/paper aesthetic)
//   ss-*  →  Storm Spot scenes  (everglade/dark aesthetic)
//
// Every variant carries its own `durationInFrames` so individual scenes can be
// stretched or shortened independently in the Studio editor.
// ─────────────────────────────────────────────────────────────────────────────

export const sceneSchema = z.discriminatedUnion("type", [
  // ── Roof Value ────────────────────────────────────────────────────────────

  z.object({
    durationInFrames: z.number().default(180),
    eyebrow: z.string().default("Your Home · Your Investment"),
    headline: z.string().default("A new roof\nisn't just\ncurb appeal."),
    /** Filename from public/ or full https:// URL */
    image: z.enum(IMAGE_OPTIONS).default("photo-13.jpeg"),
    sub: z.string().default("It's one of the best investments you can make."),
    type: z.literal("hook"),
  }),
  z.object({
    durationInFrames: z.number().default(180),
    hueshift: z.number().default(180),
    line1: z.string().default("Helping"),
    line2: z.string().default("Texas"),
    line3: z.string().default("Homeowwers").optional(),
    shiftDuration: z.number().default(10),
    style: z.number().default(5),
    type: z.literal("helping"),
  }),
  z.object({
    body: z.string().default("Simple Body").optional(),
    durationInFrames: z.number().default(180),
    headline: z.string().default("Simple Headline"),
    /** Filename from public/ or full https:// URL */
    image: z.enum(IMAGE_OPTIONS).default("photo-13.jpeg"),
    pill: z.string().default("Pill Text").optional(),
    showPill: z.boolean().default(true),
    type: z.literal("simple"),
  }),

  z.object({
    durationInFrames: z.number().default(180),
    item1: z.string().default("Energy efficiency."),
    item2: z.string().default("Protection."),
    item3: z.string().default("Peace of mind."),
    lead: z.string().default("Better"),
    type: z.literal("benefits"),
  }),

  z.object({
    detail: z
      .string()
      .default("First inspection through\nthe final walkthrough."),
    durationInFrames: z.number().default(210),
    name: z.string().default("I'm Tandra Peters."),
    profilePhoto: profilePhotoSchema,
    showProfilePhoto: z.boolean().default(true),
    tagline: z
      .string()
      .default("I help Austin-area homeowners navigate\nthe whole process."),
    type: z.literal("intro-1"),
  }),

  z.object({
    durationInFrames: z.number().default(150),
    hueShift: z.number().default(180),
    line1: z.string().default("No surprises."),
    line2: z.string().default("No pressure."),
    style: z.number().default(5),
    type: z.literal("trust"),
  }),

  z.object({
    action: z.string().default("Reach out. I'll come take a look."),
    badge: z.string().default("Free · No pressure"),
    badges: badgesSchema,
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    durationInFrames: z.number().default(180),
    punch: z.string().default("let's just\nget it done."),
    setup: z.string().default("If you've been putting it off —"),
    type: z.literal("cta"),
  }),
  z.object({
    action: z.string().default("Reach out. I'll come take a look."),
    badge: z.string().default("Free · No pressure"),
    badges: badgesSchema,
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    durationInFrames: z.number().default(180),
    punch: z.string().default("let's just\nget it done."),
    setup: z.string().default("If you've been putting it off —"),
    type: z.literal("cta-2"),
  }),

  z.object({
    badge: z.string().default("No cost · No pressure"),
    badges: badgesSchema,
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    callout: z.string().default("Give me\na call."),
    durationInFrames: z.number().default(180),
    trust: z.string().default("Honest answers,\nno sales pressure."),
    type: z.literal("cta-3"),
  }),

  z.object({
    durationInFrames: z.number().default(150),
    eyebrow: z.string().default("Storm Alert"),
    headline: z.string().default("CENTRAL\nTEXAS"),
    subline: z.string().default("just got hit."),
    type: z.literal("impact"),
  }),

  z.object({
    durationInFrames: z.number().default(150),
    punch: z.string().default("now's the\ntime."),
    setup: z.string().default("If you haven't had your roof looked at yet,"),
    type: z.literal("urgency"),
  }),

  z.object({
    durationInFrames: z.number().default(210),
    hueShift: z.number().default(180),
    label: z.string().default("Free Roof Inspections · Austin Area"),
    nameBlock: z.string().default("I'm\nTandra\nPeters."),
    profilePhoto: profilePhotoSchema,
    /** LightLeak pattern seed (0–100). Change to get a different light leak style. */
    seed: z.number().default(5),
    showProfilePhoto: z.boolean().default(true),
    tagline: z.string().default("Insurance claim guidance.\nHonest answers."),
    type: z.literal("intro"),
  }),

  z.object({
    durationInFrames: z.number().default(180),
    punch: z.string().default("insurance claim\nworth filing."),
    setup: z.string().default("I'll help you figure out whether you've got an"),
    type: z.literal("value"),
  }),

  z.object({
    durationInFrames: z.number().default(180),
    text: z.string().default("Logo Animation"),
    type: z.literal("logo-animation"),
  }),

  // ── Storm ad clips ────────────────────────────────────────────────────────

  z.object({
    bottomBar: z
      .string()
      .default("AUSTIN ROOFING CLAIMS MADE SIMPLE. CALL TODAY."),
    durationInFrames: z.number().default(180),
    headline: z.string().default("STORM DAMAGE?"),
    /** Background aerial photo */
    image: z.enum(IMAGE_OPTIONS).default("photo-20.jpeg"),
    phone: z.string().default("512-968-3965"),
    pill: z.string().default("FREE INSPECTION"),
    tagline: z.string().default("I Can Help."),
    type: z.literal("storm-hook"),
  }),

  z.object({
    company: z.string().default("Bird Creek Roofing"),
    durationInFrames: z.number().default(180),
    headline: z.string().default("STORM\nDAMAGE?"),
    /** Background aerial photo */
    image: z.enum(IMAGE_OPTIONS).default("photo-20.jpeg"),
    name: z.string().default("TANDRA PETERS"),
    phone: z.string().default("CALL OR TEXT 512-968-3965"),
    tagline: z.string().default("I've got you covered"),
    type: z.literal("storm-brand"),
  }),
]);

export type SceneConfig = z.infer<typeof sceneSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Top-level custom composition schema
// ─────────────────────────────────────────────────────────────────────────────

export const customCompositionSchema = z.object({
  /**
   * Ordered list of scenes that make up this video.
   * Add, remove, reorder, or duplicate entries in Remotion Studio's array
   * editor to build any combination. Change the `type` field on each entry
   * to switch scene styles.
   */
  scenes: z.array(sceneSchema).default([]),
});

export type CustomCompositionProps = z.infer<typeof customCompositionSchema>;
