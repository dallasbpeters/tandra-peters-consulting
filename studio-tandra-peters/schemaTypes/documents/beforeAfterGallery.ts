// studio-tandra-peters/schemaTypes/beforeAfterGallery.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'beforeAfterGallery',
  title: 'Before/After Gallery',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'beforeImage',
      title: 'Before Image',
      type: 'image',
    }),
    defineField({
      name: 'afterImage',
      title: 'After Image',
      type: 'image',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
});
