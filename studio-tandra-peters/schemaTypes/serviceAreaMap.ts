import {defineField, defineType} from 'sanity'

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
  name: 'serviceAreaMap',
  title: 'Service Area Map',
  type: 'object',
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow label',
      type: 'string',
      description: 'Small text shown above the title, e.g. "Where We Work"',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Section heading',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Optional intro sentence shown beneath the heading',
    }),
    defineField({
      name: 'areas',
      title: 'Service areas',
      type: 'array',
      description:
        'One entry per county. countyKey must match the "id" property in serviceAreas.json.',
      of: [
        {
          type: 'object',
          name: 'serviceArea',
          title: 'Service Area',
          fields: [
            defineField({
              name: 'countyKey',
              title: 'County key',
              type: 'string',
              description: 'Matches GeoJSON feature.properties.id (e.g. "travis", "bexar")',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'displayName',
              title: 'Display name',
              type: 'string',
              description: 'Shown in the map tooltip (e.g. "Travis County — Austin")',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'clientCount',
              title: 'Client count',
              type: 'number',
              description: 'Drives the choropleth colour scale — higher = darker green',
              validation: (Rule) => Rule.required().min(0).integer(),
            }),
          ],
          preview: {
            select: {title: 'displayName', subtitle: 'clientCount'},
            prepare({title, subtitle}: {title?: string; subtitle?: number}) {
              return {
                title: title ?? 'Unnamed area',
                subtitle: subtitle != null ? `${subtitle} clients` : 'No count set',
              }
            },
          },
        },
      ],
    }),
  ],
})
