export const IMAGE_SIZE_OPTIONS = [
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9",
] as const;

export type FalImageSize = (typeof IMAGE_SIZE_OPTIONS)[number];

/** Long edge for Fal `image_size` custom width/height objects (presets default to 1024px). */
export const FAL_IMAGE_LONG_EDGE_PX = 1800;

export const isFalImageSize = (value: unknown): value is FalImageSize =>
  typeof value === "string" && (IMAGE_SIZE_OPTIONS as readonly string[]).includes(value);

export const pixelsFromImageSize = (imageSize: FalImageSize): { height: number; width: number } => {
  switch (imageSize) {
    case "landscape_16_9":
      return {
        width: FAL_IMAGE_LONG_EDGE_PX,
        height: Math.round((FAL_IMAGE_LONG_EDGE_PX * 9) / 16),
      };
    case "landscape_4_3":
      return {
        width: FAL_IMAGE_LONG_EDGE_PX,
        height: Math.round((FAL_IMAGE_LONG_EDGE_PX * 3) / 4),
      };
    case "portrait_16_9":
      return {
        width: Math.round((FAL_IMAGE_LONG_EDGE_PX * 9) / 16),
        height: FAL_IMAGE_LONG_EDGE_PX,
      };
    case "portrait_4_3":
      return {
        width: Math.round((FAL_IMAGE_LONG_EDGE_PX * 3) / 4),
        height: FAL_IMAGE_LONG_EDGE_PX,
      };
    case "square_hd":
    case "square":
    default:
      return { width: FAL_IMAGE_LONG_EDGE_PX, height: FAL_IMAGE_LONG_EDGE_PX };
  }
};

export const aspectRatioFromImageSize = (imageSize: FalImageSize) => {
  switch (imageSize) {
    case "landscape_16_9":
      return "16:9";
    case "landscape_4_3":
      return "4:3";
    case "portrait_16_9":
      return "9:16";
    case "portrait_4_3":
      return "3:4";
    case "square":
    case "square_hd":
    default:
      return "1:1";
  }
};
