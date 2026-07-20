/**
 * iPhone photo intake: convert HEIC/HEIF → JPEG, bake EXIF orientation so the
 * image is upright, and downscale so large captures embed efficiently in the
 * PDF (spec Edge Cases; research "iPhone photo intake").
 */

import exifr from "exifr";

import { toLocalIsoDate } from "./format";

/** Longest edge (px) kept for the embedded/preview image. */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.82;
const HEIC_MIME = new Set(["image/heic", "image/heif"]);
const HEIC_EXT_RE = /\.hei[cf]$/iu;

export interface ProcessedPhoto {
  blob: Blob;
  height: number;
  previewUrl: string;
  /** Local `YYYY-MM-DD` from EXIF DateTimeOriginal (or CreateDate), if present. */
  takenAt: string | null;
  width: number;
}

/** Read the capture date from EXIF before re-encoding strips the metadata. */
const readTakenAt = async (source: Blob): Promise<string | null> => {
  try {
    const exif = await exifr.parse(source, [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
    ]);
    const raw =
      exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.ModifyDate ?? null;
    if (!(raw instanceof Date) || Number.isNaN(raw.getTime())) {
      return null;
    }
    return toLocalIsoDate(raw);
  } catch {
    return null;
  }
};

const isHeic = (file: File): boolean =>
  HEIC_MIME.has(file.type) || HEIC_EXT_RE.test(file.name);

const decodeUpright = async (blob: Blob): Promise<ImageBitmap> => {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Older engines may reject the orientation option — decode without it.
    return await createImageBitmap(blob);
  }
};

const canvasToJpeg = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  // Canvas encoding is callback-based; wrapping in a Promise is required.
  // oxlint-disable-next-line promise/avoid-new
  new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

/**
 * Produce an upright, downscaled JPEG plus an object-URL preview. Throws a
 * user-facing error for unsupported/corrupt files (never fails silently).
 */
export const processPhotoFile = async (file: File): Promise<ProcessedPhoto> => {
  // Capture EXIF from the original bytes before HEIC convert / JPEG re-encode
  // strips DateTimeOriginal.
  let takenAt = await readTakenAt(file);
  let sourceBlob: Blob = file;

  if (isHeic(file)) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({
        blob: file,
        quality: 0.9,
        toType: "image/jpeg",
      });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
      // Some HEIC containers only expose the date after conversion.
      if (!takenAt) {
        takenAt = await readTakenAt(sourceBlob);
      }
    } catch {
      throw new Error(
        `Could not convert "${file.name}" from HEIC. Try exporting it as JPG.`
      );
    }
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeUpright(sourceBlob);
  } catch {
    throw new Error(
      `"${file.name}" is not a readable image. Use a JPG, PNG, or HEIC file.`
    );
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not process the image (canvas unavailable).");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToJpeg(canvas);
  if (!blob) {
    throw new Error(`Could not encode "${file.name}". Try a different photo.`);
  }

  return {
    blob,
    height,
    previewUrl: URL.createObjectURL(blob),
    takenAt,
    width,
  };
};
