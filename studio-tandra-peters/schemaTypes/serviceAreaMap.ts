import { defineField, defineType } from "sanity";

/**
 * serviceAreaMap — object type embedded in homePage.
 *
 * Content modelling rationale:
 *  - GeoJSON polygon boundaries are geographic infrastructure (never change,
 *    editors don't need to touch them) → static file in src/components/serviceAreas.json
 *  - Client counts and display names are editorial data that varies → stored here
 *  - `countyKey` is the join column: it must match `feature.properties.id`
 *    in serviceAreas.json (e.g. "travis", "bexar", "mclennan")
 */
export const serviceAreaMapType = defineType({
  fields: [
    defineField({
      description: 'Small text shown above the title, e.g. "Where We Work"',
      name: "eyebrow",
      title: "Eyebrow label",
      type: "string",
    }),
    defineField({
      description: "Section heading",
      name: "title",
      title: "Title",
      type: "string",
    }),
    defineField({
      description: "Optional intro sentence shown beneath the heading",
      name: "description",
      rows: 3,
      title: "Description",
      type: "text",
    }),
    defineField({
      description:
        'One entry per county. countyKey must match the "id" property in serviceAreas.json.',
      name: "areas",
      of: [
        {
          fields: [
            defineField({
              description:
                'Matches GeoJSON feature.properties.id (e.g. "travis", "bexar")',
              name: "countyKey",
              title: "County key",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              description:
                'Shown in the map tooltip (e.g. "Travis County — Austin")',
              name: "displayName",
              title: "Display name",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              description:
                "Drives the choropleth colour scale — higher = darker green",
              name: "clientCount",
              title: "Client count",
              type: "number",
              validation: (Rule) => Rule.required().min(0).integer(),
            }),
          ],
          name: "serviceArea",
          preview: {
            prepare({
              title,
              subtitle,
            }: {
              title?: string;
              subtitle?: number;
            }) {
              return {
                subtitle:
                  subtitle == null ? "No count set" : `${subtitle} clients`,
                title: title ?? "Unnamed area",
              };
            },
            select: { subtitle: "clientCount", title: "displayName" },
          },
          title: "Service Area",
          type: "object",
        },
      ],
      title: "Service areas",
      type: "array",
    }),
  ],
  name: "serviceAreaMap",
  title: "Service Area Map",
  type: "object",
});
