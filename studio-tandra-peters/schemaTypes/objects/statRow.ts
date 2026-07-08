import { defineField, defineType } from "sanity";

import { SERVICE_ICON_OPTIONS } from "../serviceIconMeta";

export const statRowType = defineType({
  fields: [
    defineField({
      name: "name",
      title: "Label",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "value",
      title: "Value",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      initialValue: "home",
      name: "icon",
      options: {
        layout: "dropdown",
        list: [...SERVICE_ICON_OPTIONS],
      },
      title: "Icon (Iconoir)",
      type: "string",
      validation: (r) => r.required(),
    }),
  ],
  name: "statRow",
  title: "Stat",
  type: "object",
});
