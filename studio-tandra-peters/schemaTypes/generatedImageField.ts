import { defineField } from "sanity";

interface GeneratedImageOpts {
  description?: string;
  name: string;
  title?: string;
  /** Use Sanity image rules, e.g. `(rule) => rule.required()` */
  validation?: (rule: any) => any;
}

export const defineGeneratedImage = (opts: GeneratedImageOpts) =>
  defineField({
    description: opts.description,
    name: opts.name,
    options: { hotspot: true },
    title: opts.title,
    type: "image",
    validation: opts.validation,
  });
