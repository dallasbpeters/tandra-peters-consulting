import { defineField, defineType } from "sanity";

export const roofSceneSettingsType = defineType({
  name: "roofSceneSettings",
  title: "3D Roof Scene",
  type: "document",
  preview: { prepare: () => ({ title: "3D Roof Scene" }) },
  fields: [
    defineField({
      name: "props",
      title: "Camera & chapter config",
      type: "text",
      rows: 8,
      description: "JSON blob — edit via the Videos tool, not here directly.",
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
