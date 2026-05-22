import {defineField, defineType} from 'sanity'

/**
 * roofInspectionHotspot — one interactive annotation point on the
 * RoofInspection diagram (The Inspection section).
 *
 * Positions are percentage strings so they stay relative to the diagram
 * image regardless of screen size (e.g. "14%", "25%").
 * The Roman numeral is derived from array order in the mapper — editors
 * don't need to manage it manually.
 */
export const roofInspectionHotspotType = defineType({
  name: 'roofInspectionHotspot',
  title: 'Inspection hotspot',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Chapter label',
      type: 'string',
      description: 'Short name shown in the left rail nav (e.g. "Ridge & ridge vent").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'positionTop',
      title: 'Vertical position',
      type: 'string',
      description: 'CSS percentage from the top of the diagram image (e.g. "14%").',
      initialValue: '50%',
      validation: (Rule) =>
        Rule.required().regex(/^\d+(\.\d+)?%$/, {
          name: 'percentage',
          invert: false,
        }),
    }),
    defineField({
      name: 'positionLeft',
      title: 'Horizontal position',
      type: 'string',
      description: 'CSS percentage from the left of the diagram image (e.g. "25%").',
      initialValue: '50%',
      validation: (Rule) =>
        Rule.required().regex(/^\d+(\.\d+)?%$/, {
          name: 'percentage',
          invert: false,
        }),
    }),
    defineField({
      name: 'direction',
      title: 'Callout direction',
      type: 'string',
      description: 'Which side of the hotspot the detail card opens toward.',
      options: {
        list: [
          {title: 'Right →', value: 'right'},
          {title: 'Left ←', value: 'left'},
          {title: 'Up ↑', value: 'top'},
          {title: 'Down ↓', value: 'bottom'},
        ],
        layout: 'radio',
      },
      initialValue: 'right',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'calloutTitle',
      title: 'Callout headline',
      type: 'string',
      description: 'Bold heading inside the detail card (e.g. "Ridge cap & vent").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'calloutBody',
      title: 'Callout body',
      type: 'text',
      rows: 4,
      description: 'Explanatory paragraph inside the detail card.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'watchFor',
      title: 'What to watch for',
      type: 'text',
      rows: 3,
      description: 'Practical warning shown under "What to watch for" in the card.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'calloutTitle'},
    prepare({title, subtitle}: {title?: string; subtitle?: string}) {
      return {
        title: title ?? 'Unnamed hotspot',
        subtitle: subtitle ?? '',
      }
    },
  },
})
