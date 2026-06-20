import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// stormSpotSchema
//
// All editable text for the TandraStormSpot composition.
// Grouped by scene so the Studio editor presents clean sections.
// Multi-line strings use "\n" — the components render with white-space: pre-line.
// ─────────────────────────────────────────────────────────────────────────────

export const stormSpotSchema = z.object({
  /** Certification badges — shown in the CTA scene. */
  badges: z.object({
    gafMasterElite: z.boolean().default(true),
    ikoRoofSelect: z.boolean().default(true),
    rcatMember: z.boolean().default(true),
    rsraCommittee: z.boolean().default(false),
    show: z.boolean().default(true),
    tamkoPro: z.boolean().default(true),
  }),

  /** Scene 5 — CTA: "Give me a call." */
  cta: z.object({
    badge: z.string().default("No cost · No pressure"),

    byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
    callout: z.string().default("Give me\na call."),
    trust: z.string().default("Honest answers,\nno sales pressure."),
  }),

  /** Scene 1 — Impact: "CENTRAL TEXAS just got hit." */
  impact: z.object({
    eyebrow: z.string().default("Storm Alert"),
    headline: z.string().default("CENTRAL\nTEXAS"),
    subline: z.string().default("just got hit."),
  }),

  /** Scene 3 — Introduction: "I'm Tandra Peters." */
  intro: z.object({
    hueShift: z.number().default(180),
    label: z.string().default("Free Roof Inspections · Austin Area"),
    /** Rendered verbatim with white-space: pre-line — use \n for line breaks. */
    nameBlock: z.string().default("I'm\nTandra\nPeters."),
    showProfilePhoto: z.boolean().default(true),
    tagline: z.string().default("Insurance claim guidance.\nHonest answers."),
  }),

  profilePhoto: z.object({
    height: z.number().default(100),
    src: z
      .string()
      .default(
        "https://ik.imagekit.io/dtunrco/s5XsZe886hARc_iaJT_n2kz1BkFVjRKivgATP9bAOQA.png"
      ),

    width: z.number().default(100),
  }),

  showProfilePhoto: z.boolean().default(true),

  /** Scene 2 — Urgency: "If you haven't… now's the time." */
  urgency: z.object({
    punch: z.string().default("now's the\ntime."),

    setup: z.string().default("If you haven't had your roof looked at yet,"),
  }),

  /** Scene 4 — Value: "insurance claim worth filing." */
  value: z.object({
    punch: z.string().default("insurance claim\nworth filing."),

    setup: z.string().default("I'll help you figure out whether you've got an"),
  }),
});

export type StormSpotProps = z.infer<typeof stormSpotSchema>;
