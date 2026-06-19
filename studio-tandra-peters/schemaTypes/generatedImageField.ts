import { defineField } from "sanity";

interface GeneratedImageOpts {
  description?: string;
  name: string;
  title?: string;
  /** Use Sanity image rules, e.g. `(rule) => rule.required()` */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validation?: (rule: any) => any;
}

export const defineGeneratedImage = (opts: GeneratedImageOpts) =>
  defineField({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    type: "image",
    options: { hotspot: true },
    validation: opts.validation,
  });
