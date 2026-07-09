/**
 * Render-time input props for the social-ad Remotion compositions.
 *
 * Kept under `api/lib` (NOT imported from `src/`) so the Vercel serverless
 * bundle stays independent of the SPA build — same convention as
 * `fetch-tandra-intro-content.ts`. These mirror `src/remotion/ads/ad-defaults.ts`;
 * keep the two in sync if the ad copy changes. (TandraIntro copy comes from
 * Sanity, not here.)
 */
const PROFILE_PHOTO_SRC =
  "https://ik.imagekit.io/dtunrco/s5XsZe886hARc_iaJT_n2kz1BkFVjRKivgATP9bAOQA.png";

const SHARED_BADGES = {
  gafMasterElite: true,
  ikoRoofSelect: true,
  rcatMember: true,
  rsraCommittee: true,
  show: false,
  tamkoPro: true,
};

const ROOF_VALUE_DEFAULTS = {
  badges: SHARED_BADGES,
  benefits: {
    item1: "Quality Workmanship",
    item2: "Premium Materials",
    item3: "Free Inspections",
    lead: "Why choose Birdcreek Roofing?",
  },
  cta: {
    action: "Reach out. I'll come take a look.",
    badge: "Call or text: 512-968-3965",
    byline: "Tandra Peters · Birdcreek Roofing",
    punch: "Let's just\nget it done.",
    setup: "If you've been putting it off —",
  },
  hook: {
    eyebrow: "Your Home · Your Investment",
    headline: "A new roof\nisn't just\ncurb appeal.",
    image: "photo-13.jpeg",
    sub: "It's one of the best\ninvestments you can make.",
  },
  intro: {
    detail: "First inspection through\nthe final walkthrough.",
    name: "I'm Tandra.",
    profilePhoto: { height: 260, src: PROFILE_PHOTO_SRC, width: 260 },
    showProfilePhoto: true,
    tagline: "I help Austin-area homeowners navigate\nthe whole process.",
  },
  logoAnimation: { text: "Logo Animation" },
  simple: {
    body: "Simple Body",
    headline: "Free Inspection.",
    image: "photo-13.jpeg",
    pill: "No cost. No pressure.",
    showPill: true,
  },
  trust: {
    hueShift: 169,
    line1: "No surprises.",
    line2: "No pressure.",
    style: 48,
  },
};

const STORM_SPOT_DEFAULTS = {
  badges: SHARED_BADGES,
  cta: {
    badge: "No cost · No pressure",
    byline: "Tandra Peters · Birdcreek Roofing",
    callout: "Give me\na call.",
    trust: "Honest answers,\nno sales pressure.",
  },
  impact: {
    eyebrow: "Storm Alert",
    headline: "Austin",
    subline: "just got hit.",
  },
  intro: {
    hueShift: 141,
    label: "Free Roof Inspections · Austin Area",
    nameBlock: "I'm Tandra.",
    showProfilePhoto: true,
    tagline: "Insurance claim guidance. Honest answers.",
  },
  profilePhoto: { height: 200, src: PROFILE_PHOTO_SRC, width: 200 },
  showProfilePhoto: true,
  urgency: {
    punch: "now's the time.",
    setup: "If you haven't had your roof looked at yet,",
  },
  value: {
    punch: "claim worth filing.",
    setup: "I'll help you figure out if you've got a",
  },
};

const ROOF_SCENE_DEFAULTS = {
  badges: {
    gafMasterElite: false,
    ikoRoofSelect: false,
    rcatMember: false,
    rsraCommittee: false,
    show: false,
    tamkoPro: false,
  },
  chapters: [
    {
      camera: {
        azimuthal: -135.2,
        polar: 86,
        radius: 2,
        targetX: 7.81,
        targetY: 7,
        targetZ: -9.49,
      },
      durationSecs: 12,
      hotspot: { x: 14.39, y: 8.71, z: -5.09 },
      skip: false,
    },
    {
      camera: {
        azimuthal: -29.3,
        polar: 88.3,
        radius: 0.5,
        targetX: 2.13,
        targetY: 7.48,
        targetZ: -0.51,
      },
      durationSecs: 12,
      hotspot: { x: 2, y: 7.49, z: -0.19 },
      skip: false,
    },
    {
      camera: {
        azimuthal: 251.6,
        polar: 53.9,
        radius: 17.1,
        targetX: 13.89,
        targetY: 1.64,
        targetZ: -5.57,
      },
      durationSecs: 12,
      hotspot: { x: 6.62, y: 8.54, z: -8.93 },
      skip: false,
    },
    {
      camera: {
        azimuthal: 187.5,
        polar: 68.6,
        radius: 23.8,
        targetX: 10.89,
        targetY: -0.16,
        targetZ: 11.14,
      },
      durationSecs: 12,
      hotspot: { x: 5.96, y: -1.72, z: 6.85 },
      skip: false,
    },
    {
      camera: {
        azimuthal: -167.6,
        polar: 64.6,
        radius: 15,
        targetX: 9.91,
        targetY: 1.87,
        targetZ: 2.27,
      },
      durationSecs: 12,
      hotspot: { x: 6.05, y: 3.15, z: -0.33 },
      skip: false,
    },
    {
      camera: {
        azimuthal: -94.6,
        polar: 80.8,
        radius: 5.8,
        targetX: 7.06,
        targetY: 6.63,
        targetZ: -6.22,
      },
      durationSecs: 12,
      hotspot: { x: 5.41, y: 6.25, z: -5.18 },
      skip: false,
    },
    {
      camera: {
        azimuthal: -75.7,
        polar: 80,
        radius: 0.9,
        targetX: 2.38,
        targetY: 7.27,
        targetZ: -5.55,
      },
      durationSecs: 12,
      hotspot: { x: 5.17, y: 6.21, z: -5.27 },
      skip: false,
    },
  ],
  cta: {
    badge: "No cost · No pressure",
    byline: "Tandra Peters · Birdcreek Roofing",
    callout: "Give me\na call.",
    durationSecs: 12,
    trust: "Honest answers,\nno sales pressure.",
  },
  fov: 51,
  introSecs: 4,
  showCallouts: true,
  showProgress: true,
  springDamping: 22,
  springStiffness: 55,
};

const simpleScene = (
  headline: string,
  body: string,
  image: string,
  pill?: string
) => ({
  body,
  durationInFrames: 180,
  headline,
  image,
  pill: pill ?? "",
  showPill: Boolean(pill),
  type: "simple",
});

const ctaScene = {
  action: "Reach out. I'll come take a look.",
  badge: "Text or call: 512-968-3965",
  badges: { ...SHARED_BADGES, rsraCommittee: false },
  byline: "Tandra Peters · Birdcreek Roofing",
  durationInFrames: 180,
  punch: "let's just\nget it done.",
  setup: "If you've been putting it off...",
  type: "cta",
};

const logoAnimationScene = {
  durationInFrames: 180,
  text: "",
  type: "logo-animation",
};

const CUSTOM_SLOTS_DEFAULTS = {
  scenes: [
    simpleScene("Roof Damages", "", "photo-11.png", "You must keep an eye on"),
    simpleScene(
      "Water Leaks",
      "Look for water stains and discoloration on your ceilings and walls.",
      "photo-11.png"
    ),
    simpleScene(
      "Cracked Tiles",
      "Usually after extreme weather conditions.",
      "photo-13.jpeg"
    ),
    simpleScene(
      "Missing Shingles",
      "Sign of wind or storm damage.",
      "photo-16.jpg"
    ),
    ctaScene,
    logoAnimationScene,
    {
      company: "Birdcreek Roofing",
      durationInFrames: 180,
      headline: "STORM\nDAMAGE?",
      image: "photo-2.png",
      name: "TANDRA PETERS",
      phone: "CALL OR TEXT 512-968-3965",
      tagline: "I've got you covered",
      type: "storm-brand",
    },
  ],
};

const HELPING_TEXAS_DEFAULTS = {
  scenes: [
    {
      durationInFrames: 180,
      hueshift: 128,
      line1: "Helping",
      line2: "Texas",
      line3: "Homeowners",
      shiftDuration: 22,
      style: 5,
      type: "helping",
    },
    simpleScene("Roof Damages", "", "photo-11.png", "You must keep an eye on"),
    simpleScene(
      "Water Leaks",
      "Look for water stains and discoloration on your ceilings and walls.",
      "photo-11.png"
    ),
    simpleScene(
      "Cracked Tiles",
      "Usually after extreme weather conditions.",
      "photo-13.jpeg"
    ),
    simpleScene(
      "Missing Shingles",
      "Sign of wind or storm damage.",
      "photo-16.jpg"
    ),
    ctaScene,
    logoAnimationScene,
  ],
};

export const WHITEBOARD_EXPLAINER_DEFAULTS = {
  accentColor: "#1D4ED8",
  backgroundColor: "#FAFAF7",
  inkColor: "#1C1C1C",
  scenes: [
    {
      durationInFrames: 120,
      eyebrow: "Austin Area Homeowners",
      headline: "Is your roof\nstorm damaged?",
      subtitle: "Let me help you find out — for free.",
      type: "title",
    },
    {
      bullets: [
        "Free roof inspection + photo report",
        "Insurance claim guidance",
        "Oversee repairs with Birdcreek crews",
      ],
      durationInFrames: 240,
      heading: "What I do for you",
      type: "bullets",
      useCheckboxes: true,
    },
    {
      body: "Austin roofs have undocumented hail damage right now.",
      durationInFrames: 150,
      emphasis: "Yours could be one of them.",
      label: "The Reality",
      stat: "1 in 3",
      type: "callout",
    },
    {
      durationInFrames: 240,
      heading: "How it works",
      steps: [
        { detail: "Free roof assessment", label: "Inspect" },
        { detail: "Photos + written report", label: "Document" },
        { detail: "Insurance + repairs handled", label: "Navigate" },
      ],
      type: "diagram",
    },
    {
      action: "Call or text: 512-968-3965",
      badge: "No cost · No pressure",
      byline: "Tandra Peters · Birdcreek Roofing",
      durationInFrames: 150,
      headline: "Get a free\ninspection today.",
      type: "cta",
    },
  ],
  showHand: true,
  handVideoSrc: "/whiteboard/hand-marker.webm",
};

export const AD_COMPOSITION_DEFAULTS: Record<
  string,
  Record<string, unknown>
> = {
  CustomSlots: CUSTOM_SLOTS_DEFAULTS,
  HelpingTexasHomeowners: HELPING_TEXAS_DEFAULTS,
  RoofScene: ROOF_SCENE_DEFAULTS,
  TandraRoofValue: ROOF_VALUE_DEFAULTS,
  TandraStormSpot: STORM_SPOT_DEFAULTS,
  "whiteboard-explainer": WHITEBOARD_EXPLAINER_DEFAULTS,
};

export const isAdCompositionId = (id: string): boolean =>
  Object.hasOwn(AD_COMPOSITION_DEFAULTS, id);
