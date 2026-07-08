// studio-tandra-peters/schemaTypes/beforeAfterGallery.ts
import { defineField, defineType } from "sanity";

const beforeAfterGalleryType = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
    }),
    defineField({
      name: "beforeImage",
      title: "Before Image",
      type: "image",
    }),
    defineField({
      name: "afterImage",
      title: "After Image",
      type: "image",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
  ],
  name: "beforeAfterGallery",
  title: "Before/After Gallery",
  type: "document",
});

export default beforeAfterGalleryType;
