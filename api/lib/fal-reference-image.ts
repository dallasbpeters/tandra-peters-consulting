import { sanityImageUrl } from "./sanity-image-url.js";

/** Flux Dev img2img has no `image_size` input — output dimensions match the reference image. */
export const FLUX_DEV_IMAGE_TO_IMAGE_ENDPOINT = "fal-ai/flux/dev/image-to-image";

export const prepareReferenceImageUrl = (
  referenceImageUrl: string,
  endpoint: string,
  pixels: { height: number; width: number },
): string => {
  if (endpoint !== FLUX_DEV_IMAGE_TO_IMAGE_ENDPOINT) {
    return referenceImageUrl;
  }

  return sanityImageUrl(referenceImageUrl, {
    fit: "crop",
    fm: "jpg",
    h: pixels.height,
    q: 90,
    w: pixels.width,
  });
};
