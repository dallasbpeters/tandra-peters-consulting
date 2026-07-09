import { DocumentIcon } from "@sanity/icons";
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
  defineField({ name: "body", rows: 4, title: "Callout body", type: "text" }),
  defineField({ name: "watchFor", rows: 3, title: "Watch for", type: "text" }),
];

export const roofSceneChapterType = defineType({
  fields: [
    defineField({
      name: "durationSecs",
      title: "Duration (secs)",
      type: "number",
    }),
    defineField({ name: "skip", title: "Skip chapter", type: "boolean" }),
    defineField({
      fields: roofSceneCameraFields,
      name: "camera",
      title: "Camera",
      type: "object",
    }),
    defineField({
      fields: roofSceneHotspotFields,
      name: "hotspot",
      title: "Hotspot",
      type: "object",
    }),
    defineField({
      fields: roofSceneCalloutFields,
      name: "callout",
      title: "Callout copy",
      type: "object",
    }),
  ],
  name: "roofSceneChapter",
  preview: {
    prepare: ({ title, subtitle }) => ({
      subtitle:
        typeof subtitle === "string" && subtitle.trim()
          ? subtitle
          : "Editable chapter copy and position",
      title:
        typeof title === "string" && title.trim()
          ? title
          : "Roof scene chapter",
    }),
    select: { subtitle: "callout.watchFor", title: "callout.title" },
  },
  title: "Roof scene chapter",
  type: "object",
});

export const roofSceneSettingsType = defineType({
  fields: [
    defineField({
      initialValue: true,
      name: "showCallouts",
      title: "Show callouts",
      type: "boolean",
    }),
    defineField({
      initialValue: true,
      name: "showProgress",
      title: "Show progress dots",
      type: "boolean",
    }),
    defineField({
      initialValue: 51,
      name: "fov",
      title: "Field of view",
      type: "number",
    }),
    defineField({
      initialValue: 4,
      name: "introSecs",
      title: "Intro duration (secs)",
      type: "number",
    }),
    defineField({
      initialValue: 55,
      name: "springStiffness",
      title: "Camera spring stiffness",
      type: "number",
    }),
    defineField({
      initialValue: 22,
      name: "springDamping",
      title: "Camera spring damping",
      type: "number",
    }),
    defineField({
      fields: [
        defineField({ name: "trust", rows: 2, title: "Trust", type: "text" }),
        defineField({
          name: "callout",
          rows: 2,
          title: "Callout",
          type: "text",
        }),
        defineField({ name: "byline", title: "Byline", type: "string" }),
        defineField({ name: "badge", title: "Badge", type: "string" }),
        defineField({
          initialValue: 12,
          name: "durationSecs",
          title: "Duration (secs)",
          type: "number",
        }),
      ],
      name: "cta",
      title: "CTA",
      type: "object",
    }),
    defineField({
      fields: [
        defineField({
          initialValue: false,
          name: "show",
          title: "Show badges",
          type: "boolean",
        }),
        defineField({
          initialValue: false,
          name: "gafMasterElite",
          title: "GAF Master Elite",
          type: "boolean",
        }),
        defineField({
          initialValue: false,
          name: "ikoRoofSelect",
          title: "IKO Roof Select",
          type: "boolean",
        }),
        defineField({
          initialValue: false,
          name: "rcatMember",
          title: "RCAT Member",
          type: "boolean",
        }),
        defineField({
          initialValue: false,
          name: "rsraCommittee",
          title: "RSRA Committee",
          type: "boolean",
        }),
        defineField({
          initialValue: false,
          name: "tamkoPro",
          title: "Tamko Pro",
          type: "boolean",
        }),
      ],
      name: "badges",
      title: "Certification badges",
      type: "object",
    }),
    defineField({
      initialValue: [
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
      name: "chapters",
      of: [{ type: "roofSceneChapter" }],
      title: "Chapters",
      type: "array",
      validation: (Rule) => Rule.min(1).max(12),
    }),
    defineField({
      description: "Kept for backward compatibility with the Videos tool.",
      hidden: true,
      name: "props",
      rows: 8,
      title: "Legacy props blob",
      type: "text",
    }),
  ],
  icon: DocumentIcon,
  name: "roofSceneSettings",
  preview: { prepare: () => ({ title: "3D Roof Scene" }) },
  title: "3D Roof Scene",
  type: "document",
});

export const stormSpotSettingsType = defineType({
  fields: [
    defineField({
      description: "JSON blob — edit via the Videos tool, not here directly.",
      name: "props",
      rows: 8,
      title: "Ad copy & image config",
      type: "text",
    }),
  ],
  name: "stormSpotSettings",
  preview: { prepare: () => ({ title: "Storm Spot Ad" }) },
  title: "Storm Spot Ad",
  type: "document",
});

export const roofValueSettingsType = defineType({
  fields: [
    defineField({
      description: "JSON blob — edit via the Videos tool, not here directly.",
      name: "props",
      rows: 8,
      title: "Ad copy & image config",
      type: "text",
    }),
  ],
  name: "roofValueSettings",
  preview: { prepare: () => ({ title: "Roof Value Ad" }) },
  title: "Roof Value Ad",
  type: "document",
});

export const customSlotsSettingsType = defineType({
  fields: [
    defineField({
      description: "JSON blob — edit via the Videos tool, not here directly.",
      name: "props",
      rows: 8,
      title: "Scene config",
      type: "text",
    }),
  ],
  name: "customSlotsSettings",
  preview: { prepare: () => ({ title: "Custom Slots Ad" }) },
  title: "Custom Slots Ad",
  type: "document",
});

export const tandraIntroSettingsType = defineType({
  fields: [
    defineField({
      description: "JSON blob — edit via the Videos tool, not here directly.",
      name: "props",
      rows: 8,
      title: "Intro video copy config",
      type: "text",
    }),
  ],
  name: "tandraIntroSettings",
  preview: { prepare: () => ({ title: "Tandra Intro Video" }) },
  title: "Tandra Intro Video",
  type: "document",
});

export const whiteboardExplainerSettingsType = defineType({
  fields: [
    defineField({
      description: "JSON blob — edit via the Videos tool, not here directly.",
      name: "props",
      rows: 8,
      title: "Whiteboard scene config",
      type: "text",
    }),
  ],
  name: "whiteboardExplainerSettings",
  preview: { prepare: () => ({ title: "Whiteboard Explainer" }) },
  title: "Whiteboard Explainer",
  type: "document",
});

export const helpingTexasHomeownersSettingsType = defineType({
  fields: [
    defineField({
      description: "JSON blob — edit via the Videos tool, not here directly.",
      name: "props",
      rows: 8,
      title: "Scene config",
      type: "text",
    }),
  ],
  name: "helpingTexasHomeownersSettings",
  preview: { prepare: () => ({ title: "Helping Texas Homeowners Ad" }) },
  title: "Helping Texas Homeowners Ad",
  type: "document",
});
