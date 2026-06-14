import { defineField, defineType } from "sanity";

export const roofSceneSettingsType = defineType({
  name: "roofSceneSettings",
  title: "3D Roof Scene",
  type: "document",
  preview: {
    prepare: () => ({ title: "3D Roof Scene" }),
  },
  fields: [
    defineField({
      name: "props",
      title: "Camera & chapter config",
      type: "text",
      rows: 10,
      description: "JSON blob — edit via the Videos tool, not here directly.",
    }),
  ],
});
