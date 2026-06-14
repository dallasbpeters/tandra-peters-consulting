/**
 * All scene-usable images from public/.
 * Remotion Studio renders z.enum as a dropdown, so any schema field that
 * uses IMAGE_OPTIONS will show a picker instead of a free-text box.
 *
 * Add new filenames here whenever you drop an image into public/.
 */
export const IMAGE_OPTIONS = [
  "photo-0.png",
  "photo-1.png",
  "photo-2.png",
  "photo-3.png",
  "photo-8.png",
  "photo-9.png",
  "photo-10.jpg",
  "photo-11.png",
  "photo-12.jpg",
  "photo-13.jpeg",
  "photo-14.jpg",
  "photo-15.jpg",
  "photo-16.jpg",
  "photo-17.jpeg",
  "photo-21.jpeg",
  "photo-20.jpeg",
  "photo-19.jpeg",
  "photo-18.jpeg",
] as const;

export type ImageOption = (typeof IMAGE_OPTIONS)[number];
