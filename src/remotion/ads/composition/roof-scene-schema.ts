import { z } from "zod";

// ─── camera config ────────────────────────────────────────────────────────────
// Matches model-viewer camera-orbit semantics:
//   azimuthal  = rotation around vertical Y-axis (0 = front, 90 = right, -90 = left, 180 = back)
//   polar      = angle from top (0 = bird's-eye, 90 = side-on, >90 = below model)
//   radius     = distance from target in world units
//   target     = the point the camera orbits around

export const cameraConfigSchema = z.object({
  azimuthal: z.number().min(-360).max(360).multipleOf(0.1).default(-115),
  polar: z.number().min(0).max(180).multipleOf(0.1).default(55),
  radius: z.number().min(0.5).max(60).multipleOf(0.1).default(9),
  targetX: z.number().min(-20).max(20).multipleOf(0.01).default(0),
  targetY: z.number().min(-20).max(20).multipleOf(0.01).default(2.5),
  targetZ: z.number().min(-20).max(20).multipleOf(0.01).default(0),
});

/** Parsed (all fields present) camera config — use this internally after schema.parse() */
export type CameraConfig = z.infer<typeof cameraConfigSchema>;
/** Input (fields optional) — for component props / defaultProps */
export type CameraConfigInput = z.input<typeof cameraConfigSchema>;

// ─── per-chapter ──────────────────────────────────────────────────────────────

export const chapterConfigSchema = z.object({
  /** Callout copy shown in the bottom panel + hotspot. Optional — falls back to CHAPTERS. */
  callout: z
    .object({
      body: z.string().default(""),
      num: z.string().default(""),
      title: z.string().default(""),
      watchFor: z.string().default(""),
    })
    .default({ body: "", num: "", title: "", watchFor: "" }),
  camera: cameraConfigSchema,
  durationSecs: z.number().min(2).max(30).default(6),
  /** World-space position of the pulsing hotspot dot for this chapter */
  hotspot: z.object({
    x: z.number().min(-20).max(20).multipleOf(0.01).default(0),
    y: z.number().min(-20).max(20).multipleOf(0.01).default(2.5),
    z: z.number().min(-20).max(20).multipleOf(0.01).default(0),
  }),
  skip: z.boolean().default(false),
});

// ─── root schema ─────────────────────────────────────────────────────────────

export const roofSceneSchema = z.object({
  /** Certification badges shown in the CTA scene */
  badges: z
    .object({
      gafMasterElite: z.boolean().default(true),
      ikoRoofSelect: z.boolean().default(true),
      rcatMember: z.boolean().default(true),
      rsraCommittee: z.boolean().default(false),
      show: z.boolean().default(true),
      tamkoPro: z.boolean().default(true),
    })
    .default({
      gafMasterElite: true,
      ikoRoofSelect: true,
      rcatMember: true,
      rsraCommittee: false,
      show: true,
      tamkoPro: true,
    }),

  chapters: z.array(chapterConfigSchema).default([
    // i — ridge & ridge vent
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: -130,
        polar: 48,
        radius: 8,
        targetX: 0,
        targetY: 0.5,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: 0.5, z: 0 },
      skip: false,
    },
    // ii — field shingles
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: -60,
        polar: 55,
        radius: 6,
        targetX: 0,
        targetY: 0.5,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: 0.5, z: 0 },
      skip: false,
    },
    // iii — underlayment
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: 80,
        polar: 60,
        radius: 5,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: 0, z: 0 },
      skip: false,
    },
    // iv — decking
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: -120,
        polar: 70,
        radius: 6,
        targetX: 0,
        targetY: -0.5,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: -0.5, z: 0 },
      skip: false,
    },
    // v — step flashing
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: 150,
        polar: 52,
        radius: 6,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: 0, z: 0 },
      skip: false,
    },
    // vi — drip edge
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: -90,
        polar: 108,
        radius: 7,
        targetX: 0,
        targetY: -0.5,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: -0.5, z: 0 },
      skip: false,
    },
    // vii — soffit & fascia
    {
      callout: { body: "", num: "", title: "", watchFor: "" },
      camera: {
        azimuthal: -40,
        polar: 115,
        radius: 7,
        targetX: 0,
        targetY: -0.5,
        targetZ: 0,
      },
      durationSecs: 6,
      hotspot: { x: 0, y: -0.5, z: 0 },
      skip: false,
    },
  ]),

  /** CTA scene shown after all chapters */
  cta: z
    .object({
      badge: z.string().default("No cost · No pressure"),
      byline: z.string().default("Tandra Peters · Birdcreek Roofing"),
      callout: z.string().default("Give me\na call."),
      durationSecs: z.number().min(1).max(30).default(6),
      trust: z.string().default("Honest answers,\nno sales pressure."),
    })
    .default({
      badge: "No cost · No pressure",
      byline: "Tandra Peters · Birdcreek Roofing",
      callout: "Give me\na call.",
      durationSecs: 6,
      trust: "Honest answers,\nno sales pressure.",
    }),
  /** Camera field-of-view in degrees */
  fov: z.number().min(10).max(90).default(45),
  /** Intro fade duration in seconds */
  introSecs: z.number().min(0).max(12).default(0.8),
  /** Show text callout panels */
  showCallouts: z.boolean().default(true),
  /** Show chapter progress dots */
  showProgress: z.boolean().default(true),
  /** Transition spring damping */
  springDamping: z.number().min(5).max(60).default(22),
  /** Transition spring stiffness (lower = slower/bouncier) */
  springStiffness: z.number().min(10).max(200).default(55),
});

export type RoofSceneProps = z.input<typeof roofSceneSchema>;
export type ParsedRoofScene = z.infer<typeof roofSceneSchema>;
