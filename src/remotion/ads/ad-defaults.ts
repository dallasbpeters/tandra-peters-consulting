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
  gafMasterElite: true,
  ikoRoofSelect: true,
  rcatMember: true,
  rsraCommittee: true,
  show: false,
  tamkoPro: true,
} as const;

export const ROOF_VALUE_DEFAULTS = {
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
    image: "photo-13.jpeg" as const,
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
    image: "photo-13.jpeg" as const,
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

export const STORM_SPOT_DEFAULTS = {
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

export const ROOF_SCENE_DEFAULTS = {
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
      callout: {
        body: "The peak. Caps are heavier than field shingles — wind hits hardest here and the ridge is the last line of defence. The slot underneath is the ridge vent: that's how your attic breathes out in summer.",
        num: "1.",
        title: "Ridge cap & vent",
        watchFor:
          "Lifted or buckling caps after a windstorm. A vent that was painted shut during the last re-roof.",
      },
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
      callout: {
        body: "The main course. Most Texas roofs are architectural asphalt — heavier than three-tab, rated 110+ mph when nailed correctly. What you're looking at is the granular surface that takes the UV hit every summer.",
        num: "2.",
        title: "Field shingles",
        watchFor:
          "Bare patches where granules washed into the gutters. Sun age, not always storm damage.",
      },
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
      callout: {
        body: "The layer between shingles and decking — only visible at the cut face or during a tear-off. Synthetic beats old #15 felt: tougher, lighter, won't shred if wind catches it mid-install.",
        num: "3.",
        title: "Underlayment",
        watchFor:
          "Whether your installer is using the manufacturer's matched underlayment system. Mix brands and the warranty thins fast.",
      },
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
      callout: {
        body: "Plywood or OSB nailed to the rafters. You only see it during a tear-off — and that's the moment to check for soft boards. A soft board telegraphs right through the new roof within a year.",
        num: "4.",
        title: "Decking",
        watchFor:
          'A contract that includes decking replacement at cost per sheet, not a vague "as needed" line that turns into a surprise.',
      },
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
      callout: {
        body: "Bent metal pieces tucked under each shingle course where the slope meets a vertical wall. Half the leaks I see start here — because someone saved twenty minutes during install.",
        num: "5.",
        title: "Step flashing",
        watchFor:
          "One continuous L-strip pretending to be step flashing. That's a leak waiting for the first hard sideways rain.",
      },
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
      callout: {
        body: "The L-shaped metal that runs along the eave and rakes, kicking water away from the fascia into the gutter. Code in Texas. Skipped on more cheap re-roofs than I'd like to count.",
        num: "6.",
        title: "Drip edge",
        watchFor:
          "Stain lines on the fascia board below — water's been running where it shouldn't.",
      },
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
      callout: {
        body: "The boards you see from the driveway — fascia in front, soffit underneath. Soffit vents are how cool air enters the attic; without them the ridge vent has nothing to pull through.",
        num: "7.",
        title: "Soffit & fascia",
        watchFor:
          "Painted-over soffit vents, wasp nests at the corners, or wood that gives under a fingernail.",
      },
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

type SimpleImage = "photo-11.png" | "photo-13.jpeg" | "photo-16.jpg";

const simpleScene = (
  headline: string,
  body: string,
  image: SimpleImage,
  pill?: string
) => ({
  body,
  durationInFrames: 180,
  headline,
  image,
  pill: pill ?? "",
  showPill: Boolean(pill),
  type: "simple" as const,
});

const ctaScene = {
  action: "Reach out. I'll come take a look.",
  badge: "Text or call: 512-968-3965",
  badges: { ...SHARED_BADGES, rsraCommittee: false },
  byline: "Tandra Peters · Birdcreek Roofing",
  durationInFrames: 180,
  punch: "let's just\nget it done.",
  setup: "If you've been putting it off...",
  type: "cta" as const,
};

const logoAnimationScene = {
  durationInFrames: 180,
  text: "",
  type: "logo-animation" as const,
};

export const CUSTOM_SLOTS_DEFAULTS = {
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
      image: "photo-2.png" as const,
      name: "TANDRA PETERS",
      phone: "CALL OR TEXT 512-968-3965",
      tagline: "I've got you covered",
      type: "storm-brand" as const,
    },
  ],
};

export const HELPING_TEXAS_DEFAULTS = {
  scenes: [
    {
      durationInFrames: 180,
      hueshift: 128,
      line1: "Helping",
      line2: "Texas",
      line3: "Homeowners",
      shiftDuration: 22,
      style: 5,
      type: "helping" as const,
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
