import { z } from "zod";

import { IMAGE_OPTIONS } from "./images";

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-schemas reused across scene variants
// ─────────────────────────────────────────────────────────────────────────────

const badgesSchema = z.object({
  show: z.boolean().default(false),
  gafMasterElite: z.boolean().default(true),
  ikoRoofSelect: z.boolean().default(true),
  rcatMember: z.boolean().default(true),
  rsraCommittee: z.boolean().default(false),
  tamkoPro: z.boolean().default(true),
});

const profilePhotoSchema = z.object({
  src: z
    .string()
    .default("https://ik.imagekit.io/dtunrco/s5XsZe886hARc_iaJT_n2kz1BkFVjRKivgATP9bAOQA.png"),
  width: z.number().default(260),
  height: z.number().default(260),
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
    type: z.literal("hook"),
    durationInFrames: z.number().default(180),
    eyebrow: z.string().default("Your Home · Your Investment"),
    headline: z.string().default("A new roof\nisn't just\ncurb appeal."),
    sub: z.string().default("It's one of the best investments you can make."),
    /** Filename from public/ or full https:// URL */
    image: z.enum(IMAGE_OPTIONS).default("photo-13.jpeg"),
  }),
  z.object({
    type: z.literal("helping"),
    durationInFrames: z.number().default(180),
    line1: z.string().default("Helping"),
    line2: z.string().default("Texas"),
    line3: z.string().default("Homeowwers").optional(),
    style: z.number().default(5),
    hueshift: z.number().default(180),
    shiftDuration: z.number().default(10),
  }),
  z.object({
    type: z.literal("simple"),
    durationInFrames: z.number().default(180),
    headline: z.string().default("Simple Headline"),
    showPill: z.boolean().default(true),
    body: z.string().default("Simple Body").optional(),
    pill: z.string().default("Pill Text").optional(),
    /** Filename from public/ or full https:// URL */
    image: z.enum(IMAGE_OPTIONS).default("photo-13.jpeg"),
  }),

  z.object({
    type: z.literal("benefits"),
    durationInFrames: z.number().default(180),
    lead: z.string().default("Better"),
    item1: z.string().default("Energy efficiency."),
    item2: z.string().default("Protection."),
    item3: z.string().default("Peace of mind."),
  }),

  z.object({
    type: z.literal("intro-1"),
    durationInFrames: z.number().default(210),
    name: z.string().default("I'm Tandra Peters."),
    tagline: z.string().default("I help Austin-area homeowners navigate\nthe whole process."),
    detail: z.string().default("First inspection through\nthe final walkthrough."),
    showProfilePhoto: z.boolean().default(true),
    profilePhoto: profilePhotoSchema,
  }),

  z.object({
    type: z.literal("trust"),
    durationInFrames: z.number().default(150),
    hueShift: z.number().default(180),
    style: z.number().default(5),
    line1: z.string().default("No surprises."),
    line2: z.string().default("No pressure."),
  }),

  z.object({
    type: z.literal("cta"),
    durationInFrames: z.number().default(180),
    setup: z.string().default("If you've been putting it off —"),
    punch: z.string().default("let's just\nget it done."),
    action: z.string().default("Reach out. I'll come take a look."),
    badge: z.string().default("Free · No pressure"),
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    badges: badgesSchema,
  }),
  z.object({
    type: z.literal("cta-2"),
    durationInFrames: z.number().default(180),
    setup: z.string().default("If you've been putting it off —"),
    punch: z.string().default("let's just\nget it done."),
    action: z.string().default("Reach out. I'll come take a look."),
    badge: z.string().default("Free · No pressure"),
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    badges: badgesSchema,
  }),

  z.object({
    type: z.literal("cta-3"),
    durationInFrames: z.number().default(180),
    trust: z.string().default("Honest answers,\nno sales pressure."),
    callout: z.string().default("Give me\na call."),
    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    badge: z.string().default("No cost · No pressure"),
    badges: badgesSchema,
  }),

  z.object({
    type: z.literal("impact"),
    durationInFrames: z.number().default(150),
    eyebrow: z.string().default("Storm Alert"),
    headline: z.string().default("CENTRAL\nTEXAS"),
    subline: z.string().default("just got hit."),
  }),

  z.object({
    type: z.literal("urgency"),
    durationInFrames: z.number().default(150),
    setup: z.string().default("If you haven't had your roof looked at yet,"),
    punch: z.string().default("now's the\ntime."),
  }),

  z.object({
    type: z.literal("intro"),
    durationInFrames: z.number().default(210),
    hueShift: z.number().default(180),
    /** LightLeak pattern seed (0–100). Change to get a different light leak style. */
    seed: z.number().default(5),
    showProfilePhoto: z.boolean().default(true),
    profilePhoto: profilePhotoSchema,
    label: z.string().default("Free Roof Inspections · Austin Area"),
    nameBlock: z.string().default("I'm\nTandra\nPeters."),
    tagline: z.string().default("Insurance claim guidance.\nHonest answers."),
  }),

  z.object({
    type: z.literal("value"),
    durationInFrames: z.number().default(180),
    setup: z.string().default("I'll help you figure out whether you've got an"),
    punch: z.string().default("insurance claim\nworth filing."),
  }),

  z.object({
    type: z.literal("logo-animation"),
    durationInFrames: z.number().default(180),
    text: z.string().default("Logo Animation"),
  }),

  // ── Storm ad clips ────────────────────────────────────────────────────────

  z.object({
    type: z.literal("storm-hook"),
    durationInFrames: z.number().default(180),
    /** Background aerial photo */
    image: z.enum(IMAGE_OPTIONS).default("photo-20.jpeg"),
    headline: z.string().default("STORM DAMAGE?"),
    tagline: z.string().default("I Can Help."),
    pill: z.string().default("FREE INSPECTION"),
    phone: z.string().default("512-968-3965"),
    bottomBar: z.string().default("AUSTIN ROOFING CLAIMS MADE SIMPLE. CALL TODAY."),
  }),

  z.object({
    type: z.literal("storm-brand"),
    durationInFrames: z.number().default(180),
    /** Background aerial photo */
    image: z.enum(IMAGE_OPTIONS).default("photo-20.jpeg"),
    headline: z.string().default("STORM\nDAMAGE?"),
    tagline: z.string().default("I've got you covered"),
    phone: z.string().default("CALL OR TEXT 512-968-3965"),
    name: z.string().default("TANDRA PETERS"),
    company: z.string().default("Bird Creek Roofing"),
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
