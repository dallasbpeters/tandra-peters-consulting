import {defineArrayMember, defineField, defineType} from 'sanity'

const lineFields = [
  defineField({name: 'kicker', title: 'Kicker', type: 'string'}),
  defineField({name: 'line1', title: 'Line 1', type: 'string'}),
  defineField({name: 'line2', title: 'Line 2', type: 'string'}),
]

const stringListField = defineField({
  name: 'items',
  title: 'Bottom labels',
  type: 'array',
  of: [defineArrayMember({type: 'string'})],
  validation: (Rule) => Rule.max(4),
})

export const tandraIntroVideoType = defineType({
  name: 'tandraIntroVideo',
  title: 'Tandra intro video',
  type: 'object',
  description: 'Editable copy and render output for the 30-second Remotion intro video.',
  groups: [
    {name: 'storm', title: 'Opening', default: true},
    {name: 'straightAnswers', title: 'Straight answers'},
    {name: 'inspection', title: 'Inspection'},
    {name: 'managed', title: 'Managed process'},
    {name: 'proof', title: 'Proof'},
    {name: 'closing', title: 'Closing'},
    {name: 'media', title: 'Thumbnail'},
    {name: 'render', title: 'Render output'},
  ],
  fields: [
    defineField({
      name: 'thumbnail',
      title: 'Video thumbnail',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      description: 'Poster image shown before the Remotion player or rendered MP4 starts.',
    }),
    defineField({
      name: 'storm',
      title: 'Opening storm scene',
      type: 'object',
      group: 'storm',
      fields: [
        ...lineFields,
        defineField({name: 'body', title: 'Body copy', type: 'text', rows: 3}),
      ],
    }),
    defineField({
      name: 'straightAnswers',
      title: 'Straight answers scene',
      type: 'object',
      group: 'straightAnswers',
      fields: [
        ...lineFields,
        defineField({name: 'line3', title: 'Line 3', type: 'string'}),
        defineField({name: 'quote', title: 'Quote', type: 'text', rows: 2}),
      ],
    }),
    defineField({
      name: 'inspection',
      title: 'Inspection scene',
      type: 'object',
      group: 'inspection',
      fields: [
        ...lineFields,
        defineField({name: 'line3', title: 'Line 3', type: 'string'}),
        defineField({name: 'body', title: 'Body copy', type: 'text', rows: 3}),
      ],
    }),
    defineField({
      name: 'managed',
      title: 'Managed process scene',
      type: 'object',
      group: 'managed',
      fields: [
        ...lineFields,
        defineField({name: 'line3', title: 'Line 3', type: 'string'}),
        defineField({
          ...stringListField,
          title: 'Process labels',
          validation: (Rule) => Rule.min(1).max(4),
        }),
      ],
    }),
    defineField({
      name: 'proof',
      title: 'Proof scene',
      type: 'object',
      group: 'proof',
      fields: [
        ...lineFields,
        defineField({
          ...stringListField,
          title: 'Service labels',
          validation: (Rule) => Rule.min(1).max(3),
        }),
      ],
    }),
    defineField({
      name: 'closing',
      title: 'Closing scene',
      type: 'object',
      group: 'closing',
      fields: [...lineFields, defineField({name: 'cta', title: 'Call to action', type: 'string'})],
    }),
    defineField({
      name: 'renderedVideoUrl',
      title: 'Latest rendered video URL',
      type: 'url',
      group: 'render',
      readOnly: true,
      description:
        'Set automatically after a Remotion render (POST /api/render-tandra-intro). The homepage plays this URL when present, instead of the Home page featured video upload.',
    }),
    defineField({
      name: 'renderedAt',
      title: 'Last rendered',
      type: 'datetime',
      group: 'render',
      readOnly: true,
    }),
    defineField({
      name: 'renderContentHash',
      title: 'Rendered content hash',
      type: 'string',
      group: 'render',
      readOnly: true,
      hidden: true,
      description: 'Used by the Sanity publish webhook to avoid re-rendering when only render metadata changes.',
    }),
  ],
  initialValue: {
    storm: {
      kicker: 'Austin homeowners',
      line1: 'Texas roofs',
      line2: 'take a beating.',
      body: 'Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.',
    },
    straightAnswers: {
      kicker: 'Why Tandra?',
      line1: 'Straight',
      line2: 'answers.',
      line3: 'No pressure.',
      quote: "If your roof just needs a repair, I'll tell you that.",
    },
    inspection: {
      kicker: 'On your roof',
      line1: 'I inspect.',
      line2: 'I document.',
      line3: 'I explain.',
      body: 'You get the real condition of your roof, what matters now, and what can wait.',
    },
    managed: {
      kicker: 'What homeowners need',
      line1: 'One steady',
      line2: 'point of contact',
      line3: 'from first look to final walkthrough.',
      items: [
        'Insurance claim guidance',
        'Scope and paperwork review',
        'Birdcreek Roofing crews',
        'Final walkthrough',
      ],
    },
    proof: {
      kicker: 'Built for Austin-area homeowners',
      line1: 'Local roof know-how.',
      line2: 'Backed by Birdcreek.',
      items: ['Roof assessments', 'Insurance help', 'Project oversight'],
    },
    closing: {
      kicker: 'Tandra Peters · Austin roofing consultant',
      line1: 'Your roof,',
      line2: 'handled right.',
      cta: 'Schedule a free consultation',
    },
  },
  preview: {
    prepare: () => ({title: 'Tandra intro video'}),
  },
})
