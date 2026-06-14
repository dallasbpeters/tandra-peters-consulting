/**
 * Default input props for the social-ad Remotion compositions.
 *
 * Single source of truth shared by:
 *  - `AdsCompositions.tsx` (the Remotion bundle `<Composition defaultProps>`)
 *  - `../registry.tsx` (the in-browser preview + Studio picker)
 *
 * These ads are not CMS-backed yet — their copy lives here. (TandraIntro copy
 * lives in Sanity `homePage.tandraIntroVideo`.)
 */
const PROFILE_PHOTO_SRC =
  "https://ik.imagekit.io/dtunrco/s5XsZe886hARc_iaJT_n2kz1BkFVjRKivgATP9bAOQA.png";

const SHARED_BADGES = {
  show: false,
  gafMasterElite: true,
  ikoRoofSelect: true,
  rcatMember: true,
  rsraCommittee: true,
  tamkoPro: true,
} as const;

export const ROOF_VALUE_DEFAULTS = {
  hook: {
    eyebrow: "Your Home · Your Investment",
    headline: "A new roof\nisn't just\ncurb appeal.",
    sub: "It's one of the best\ninvestments you can make.",
    image: "photo-13.jpeg" as const,
  },
  simple: {
    headline: "Free Inspection.",
    body: "Simple Body",
    showPill: true,
    pill: "No cost. No pressure.",
    image: "photo-13.jpeg" as const,
  },
  benefits: {
    lead: "Why choose Birdcreek Roofing?",
    item1: "Quality Workmanship",
    item2: "Premium Materials",
    item3: "Free Inspections",
  },
  intro: {
    name: "I'm Tandra.",
    tagline: "I help Austin-area homeowners navigate\nthe whole process.",
    detail: "First inspection through\nthe final walkthrough.",
    showProfilePhoto: true,
    profilePhoto: { src: PROFILE_PHOTO_SRC, width: 260, height: 260 },
  },
  trust: { line1: "No surprises.", line2: "No pressure.", hueShift: 169, style: 48 },
  cta: {
    setup: "If you've been putting it off —",
    punch: "Let's just\nget it done.",
    action: "Reach out. I'll come take a look.",
    badge: "Call or text: 512-968-3965",
    byline: "Tandra Peters · Birdcreek Roofing",
  },
  badges: SHARED_BADGES,
  logoAnimation: { text: "Logo Animation" },
};

export const STORM_SPOT_DEFAULTS = {
  showProfilePhoto: true,
  profilePhoto: { width: 200, height: 200, src: PROFILE_PHOTO_SRC },
  impact: { eyebrow: "Storm Alert", headline: "Austin", subline: "just got hit." },
  urgency: { setup: "If you haven't had your roof looked at yet,", punch: "now's the time." },
  intro: {
    hueShift: 141,
    showProfilePhoto: true,
    label: "Free Roof Inspections · Austin Area",
    nameBlock: "I'm Tandra.",
    tagline: "Insurance claim guidance. Honest answers.",
  },
  value: { setup: "I'll help you figure out if you've got a", punch: "claim worth filing." },
  cta: {
    trust: "Honest answers,\nno sales pressure.",
    callout: "Give me\na call.",
    byline: "Tandra Peters · Birdcreek Roofing",
    badge: "No cost · No pressure",
  },
  badges: SHARED_BADGES,
};

export const ROOF_SCENE_DEFAULTS = {
  showCallouts: true,
  showProgress: true,
  fov: 51,
  introSecs: 4,
  springStiffness: 55,
  springDamping: 22,
  cta: {
    trust: "Honest answers,\nno sales pressure.",
    callout: "Give me\na call.",
    byline: "Tandra Peters · Birdcreek Roofing",
    badge: "No cost · No pressure",
    durationSecs: 12,
  },
  badges: {
    show: false,
    gafMasterElite: false,
    ikoRoofSelect: false,
    rcatMember: false,
    rsraCommittee: false,
    tamkoPro: false,
  },
  chapters: [
    {
      durationSecs: 12,
      skip: false,
      camera: { azimuthal: -155, polar: 64, radius: 7, targetX: 3, targetY: 7, targetZ: 1 },
      hotspot: { x: 4.19, y: 8.26, z: 1 },
    },
    {
      durationSecs: 12,
      skip: false,
      camera: { azimuthal: -127, polar: 59, radius: 9, targetX: 2, targetY: 6, targetZ: 0 },
      hotspot: { x: 2, y: 7.27, z: 0 },
    },
    {
      durationSecs: 12,
      skip: false,
      camera: { azimuthal: -166, polar: 65, radius: 3, targetX: 1, targetY: 8, targetZ: -2 },
      hotspot: { x: 0.45, y: 8.54, z: -2 },
    },
    {
      durationSecs: 12,
      skip: false,
      camera: { azimuthal: -120, polar: 70, radius: 6, targetX: 0, targetY: 8, targetZ: -2 },
      hotspot: { x: 1.04, y: 8.51, z: -3.43 },
    },
    {
      durationSecs: 12,
      skip: false,
      camera: { azimuthal: -156, polar: 72, radius: 8.4, targetX: 4, targetY: 7, targetZ: 2 },
      hotspot: { x: 0.88, y: 9.18, z: -4.36 },
    },
    {
      durationSecs: 12,
      skip: false,
      camera: {
        azimuthal: -101.7,
        polar: 80.8,
        radius: 5.8,
        targetX: 1,
        targetY: 7.61,
        targetZ: -3,
      },
      hotspot: { x: 1.5, y: 5.94, z: -1.03 },
    },
    {
      durationSecs: 12,
      skip: false,
      camera: { azimuthal: -52.1, polar: 98, radius: 7, targetX: 0, targetY: 7.5, targetZ: -2 },
      hotspot: { x: 1.15, y: 8.31, z: -2 },
    },
  ],
};

type SimpleImage = "photo-11.png" | "photo-13.jpeg" | "photo-16.jpg";

const simpleScene = (headline: string, body: string, image: SimpleImage, pill?: string) => ({
  type: "simple" as const,
  durationInFrames: 180,
  headline,
  body,
  showPill: Boolean(pill),
  pill: pill ?? "",
  image,
});

const ctaScene = {
  type: "cta" as const,
  durationInFrames: 180,
  setup: "If you've been putting it off...",
  punch: "let's just\nget it done.",
  action: "Reach out. I'll come take a look.",
  badge: "Text or call: 512-968-3965",
  byline: "Tandra Peters · Birdcreek Roofing",
  badges: { ...SHARED_BADGES, rsraCommittee: false },
};

const logoAnimationScene = { type: "logo-animation" as const, durationInFrames: 180, text: "" };

export const CUSTOM_SLOTS_DEFAULTS = {
  scenes: [
    simpleScene("Roof Damages", "", "photo-11.png", "You must keep an eye on"),
    simpleScene(
      "Water Leaks",
      "Look for water stains and discoloration on your ceilings and walls.",
      "photo-11.png",
    ),
    simpleScene("Cracked Tiles", "Usually after extreme weather conditions.", "photo-13.jpeg"),
    simpleScene("Missing Shingles", "Sign of wind or storm damage.", "photo-16.jpg"),
    ctaScene,
    logoAnimationScene,
    {
      type: "storm-brand" as const,
      durationInFrames: 180,
      image: "photo-2.png" as const,
      headline: "STORM\nDAMAGE?",
      tagline: "I've got you covered",
      phone: "CALL OR TEXT 512-968-3965",
      name: "TANDRA PETERS",
      company: "Birdcreek Roofing",
    },
  ],
};

export const HELPING_TEXAS_DEFAULTS = {
  scenes: [
    {
      type: "helping" as const,
      durationInFrames: 180,
      line1: "Helping",
      line2: "Texas",
      line3: "Homeowners",
      style: 5,
      hueshift: 128,
      shiftDuration: 22,
    },
    simpleScene("Roof Damages", "", "photo-11.png", "You must keep an eye on"),
    simpleScene(
      "Water Leaks",
      "Look for water stains and discoloration on your ceilings and walls.",
      "photo-11.png",
    ),
    simpleScene("Cracked Tiles", "Usually after extreme weather conditions.", "photo-13.jpeg"),
    simpleScene("Missing Shingles", "Sign of wind or storm damage.", "photo-16.jpg"),
    ctaScene,
    logoAnimationScene,
  ],
};
