import { defineField, defineType } from "sanity";

export const roofSceneCameraFields = [
  defineField({ name: "azimuthal", title: "Azimuthal", type: "number" }),
  defineField({ name: "polar", title: "Polar", type: "number" }),
  defineField({ name: "radius", title: "Radius", type: "number" }),
  defineField({ name: "targetX", title: "Target X", type: "number" }),
  defineField({ name: "targetY", title: "Target Y", type: "number" }),
  defineField({ name: "targetZ", title: "Target Z", type: "number" }),
];

export const roofSceneHotspotFields = [
  defineField({ name: "x", title: "Hotspot X", type: "number" }),
  defineField({ name: "y", title: "Hotspot Y", type: "number" }),
  defineField({ name: "z", title: "Hotspot Z", type: "number" }),
];

export const roofSceneCalloutFields = [
  defineField({ name: "num", title: "Number", type: "string" }),
  defineField({ name: "title", title: "Callout title", type: "string" }),
  defineField({ name: "body", title: "Callout body", type: "text", rows: 4 }),
  defineField({ name: "watchFor", title: "Watch for", type: "text", rows: 3 }),
];

export const roofSceneChapterType = defineType({
  name: "roofSceneChapter",
  title: "Roof scene chapter",
  type: "object",
  fields: [
    defineField({ name: "durationSecs", title: "Duration (secs)", type: "number" }),
    defineField({ name: "skip", title: "Skip chapter", type: "boolean" }),
    defineField({ name: "camera", title: "Camera", type: "object", fields: roofSceneCameraFields }),
    defineField({
      name: "hotspot",
      title: "Hotspot",
      type: "object",
      fields: roofSceneHotspotFields,
    }),
    defineField({
      name: "callout",
      title: "Callout copy",
      type: "object",
      fields: roofSceneCalloutFields,
    }),
  ],
  preview: {
    select: { title: "callout.title", subtitle: "callout.watchFor" },
    prepare: ({ title, subtitle }) => ({
      title: typeof title === "string" && title.trim() ? title : "Roof scene chapter",
      subtitle:
        typeof subtitle === "string" && subtitle.trim()
          ? subtitle
          : "Editable chapter copy and position",
    }),
  },
});

export const roofSceneSettingsType = defineType({
  name: "roofSceneSettings",
  title: "3D Roof Scene",
  type: "document",
  preview: { prepare: () => ({ title: "3D Roof Scene" }) },
  fields: [
    defineField({
      name: "showCallouts",
      title: "Show callouts",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "showProgress",
      title: "Show progress dots",
      type: "boolean",
      initialValue: true,
    }),
    defineField({ name: "fov", title: "Field of view", type: "number", initialValue: 51 }),
    defineField({
      name: "introSecs",
      title: "Intro duration (secs)",
      type: "number",
      initialValue: 4,
    }),
    defineField({
      name: "springStiffness",
      title: "Camera spring stiffness",
      type: "number",
      initialValue: 55,
    }),
    defineField({
      name: "springDamping",
      title: "Camera spring damping",
      type: "number",
      initialValue: 22,
    }),
    defineField({
      name: "cta",
      title: "CTA",
      type: "object",
      fields: [
        defineField({ name: "trust", title: "Trust", type: "text", rows: 2 }),
        defineField({ name: "callout", title: "Callout", type: "text", rows: 2 }),
        defineField({ name: "byline", title: "Byline", type: "string" }),
        defineField({ name: "badge", title: "Badge", type: "string" }),
        defineField({
          name: "durationSecs",
          title: "Duration (secs)",
          type: "number",
          initialValue: 12,
        }),
      ],
    }),
    defineField({
      name: "badges",
      title: "Certification badges",
      type: "object",
      fields: [
        defineField({ name: "show", title: "Show badges", type: "boolean", initialValue: false }),
        defineField({
          name: "gafMasterElite",
          title: "GAF Master Elite",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "ikoRoofSelect",
          title: "IKO Roof Select",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "rcatMember",
          title: "RCAT Member",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "rsraCommittee",
          title: "RSRA Committee",
          type: "boolean",
          initialValue: false,
        }),
        defineField({ name: "tamkoPro", title: "Tamko Pro", type: "boolean", initialValue: false }),
      ],
    }),
    defineField({
      name: "chapters",
      title: "Chapters",
      type: "array",
      of: [{ type: "roofSceneChapter" }],
      validation: (Rule) => Rule.min(1).max(12),
      initialValue: [
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: -135.2,
            polar: 86,
            radius: 2,
            targetX: 7.81,
            targetY: 7,
            targetZ: -9.49,
          },
          hotspot: { x: 14.39, y: 8.71, z: -5.09 },
          callout: {
            num: "1.",
            title: "Ridge cap & vent",
            body: "The peak. Caps are heavier than field shingles — wind hits hardest here and the ridge is the last line of defence. The slot underneath is the ridge vent: that's how your attic breathes out in summer.",
            watchFor:
              "Lifted or buckling caps after a windstorm. A vent that was painted shut during the last re-roof.",
          },
        },
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: -29.3,
            polar: 88.3,
            radius: 0.5,
            targetX: 2.13,
            targetY: 7.48,
            targetZ: -0.51,
          },
          hotspot: { x: 2, y: 7.49, z: -0.19 },
          callout: {
            num: "2.",
            title: "Field shingles",
            body: "The main course. Most Texas roofs are architectural asphalt — heavier than three-tab, rated 110+ mph when nailed correctly. What you're looking at is the granular surface that takes the UV hit every summer.",
            watchFor:
              "Bare patches where granules washed into the gutters. Sun age, not always storm damage.",
          },
        },
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: 251.6,
            polar: 53.9,
            radius: 17.1,
            targetX: 13.89,
            targetY: 1.64,
            targetZ: -5.57,
          },
          hotspot: { x: 6.62, y: 8.54, z: -8.93 },
          callout: {
            num: "3.",
            title: "Underlayment",
            body: "The layer between shingles and decking — only visible at the cut face or during a tear-off. Synthetic beats old #15 felt: tougher, lighter, won't shred if wind catches it mid-install.",
            watchFor:
              "Whether your installer is using the manufacturer's matched underlayment system. Mix brands and the warranty thins fast.",
          },
        },
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: 187.5,
            polar: 68.6,
            radius: 23.8,
            targetX: 10.89,
            targetY: -0.16,
            targetZ: 11.14,
          },
          hotspot: { x: 5.96, y: -1.72, z: 6.85 },
          callout: {
            num: "4.",
            title: "Decking",
            body: "Plywood or OSB nailed to the rafters. You only see it during a tear-off — and that's the moment to check for soft boards. A soft board telegraphs right through the new roof within a year.",
            watchFor:
              'A contract that includes decking replacement at cost per sheet, not a vague "as needed" line that turns into a surprise.',
          },
        },
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: -167.6,
            polar: 64.6,
            radius: 15,
            targetX: 9.91,
            targetY: 1.87,
            targetZ: 2.27,
          },
          hotspot: { x: 6.05, y: 3.15, z: -0.33 },
          callout: {
            num: "5.",
            title: "Step flashing",
            body: "Bent metal pieces tucked under each shingle course where the slope meets a vertical wall. Half the leaks I see start here — because someone saved twenty minutes during install.",
            watchFor:
              "One continuous L-strip pretending to be step flashing. That's a leak waiting for the first hard sideways rain.",
          },
        },
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: -94.6,
            polar: 80.8,
            radius: 5.8,
            targetX: 7.06,
            targetY: 6.63,
            targetZ: -6.22,
          },
          hotspot: { x: 5.41, y: 6.25, z: -5.18 },
          callout: {
            num: "6.",
            title: "Drip edge",
            body: "The L-shaped metal that runs along the eave and rakes, kicking water away from the fascia into the gutter. Code in Texas. Skipped on more cheap re-roofs than I'd like to count.",
            watchFor:
              "Stain lines on the fascia board below — water's been running where it shouldn't.",
          },
        },
        {
          durationSecs: 12,
          skip: false,
          camera: {
            azimuthal: -75.7,
            polar: 80,
            radius: 0.9,
            targetX: 2.38,
            targetY: 7.27,
            targetZ: -5.55,
          },
          hotspot: { x: 5.17, y: 6.21, z: -5.27 },
          callout: {
            num: "7.",
            title: "Soffit & fascia",
            body: "The boards you see from the driveway — fascia in front, soffit underneath. Soffit vents are how cool air enters the attic; without them the ridge vent has nothing to pull through.",
            watchFor:
              "Painted-over soffit vents, wasp nests at the corners, or wood that gives under a fingernail.",
          },
        },
      ],
    }),
    defineField({
      name: "props",
      title: "Legacy props blob",
      type: "text",
      rows: 8,
      hidden: true,
      description: "Kept for backward compatibility with the Videos tool.",
    }),
  ],
});

export const stormSpotSettingsType = defineType({
  name: "stormSpotSettings",
  title: "Storm Spot Ad",
  type: "document",
  preview: { prepare: () => ({ title: "Storm Spot Ad" }) },
  fields: [
    defineField({
      name: "props",
      title: "Ad copy & image config",
      type: "text",
      rows: 8,
      description: "JSON blob — edit via the Videos tool, not here directly.",
    }),
  ],
});

export const roofValueSettingsType = defineType({
  name: "roofValueSettings",
  title: "Roof Value Ad",
  type: "document",
  preview: { prepare: () => ({ title: "Roof Value Ad" }) },
  fields: [
    defineField({
      name: "props",
      title: "Ad copy & image config",
      type: "text",
      rows: 8,
      description: "JSON blob — edit via the Videos tool, not here directly.",
    }),
  ],
});

export const customSlotsSettingsType = defineType({
  name: "customSlotsSettings",
  title: "Custom Slots Ad",
  type: "document",
  preview: { prepare: () => ({ title: "Custom Slots Ad" }) },
  fields: [
    defineField({
      name: "props",
      title: "Scene config",
      type: "text",
      rows: 8,
      description: "JSON blob — edit via the Videos tool, not here directly.",
    }),
  ],
});

export const tandraIntroSettingsType = defineType({
  name: "tandraIntroSettings",
  title: "Tandra Intro Video",
  type: "document",
  preview: { prepare: () => ({ title: "Tandra Intro Video" }) },
  fields: [
    defineField({
      name: "props",
      title: "Intro video copy config",
      type: "text",
      rows: 8,
      description: "JSON blob — edit via the Videos tool, not here directly.",
    }),
  ],
});

export const helpingTexasHomeownersSettingsType = defineType({
  name: "helpingTexasHomeownersSettings",
  title: "Helping Texas Homeowners Ad",
  type: "document",
  preview: { prepare: () => ({ title: "Helping Texas Homeowners Ad" }) },
  fields: [
    defineField({
      name: "props",
      title: "Scene config",
      type: "text",
      rows: 8,
      description: "JSON blob — edit via the Videos tool, not here directly.",
    }),
  ],
});
