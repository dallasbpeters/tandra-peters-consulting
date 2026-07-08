import type { FalClient } from "@fal-ai/client";
import sharp from "sharp";

export type BackgroundRemovalModel = "birefnet-heavy" | "bria" | "ideogram";

interface FalImageFile {
  content_type?: string;
  file_name?: string;
  file_size?: number;
  height?: number;
  url?: string;
  width?: number;
}

interface BackgroundRemovalResult {
  endpoint: string;
  image: FalImageFile;
  requestId: string;
}

const fetchBuffer = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download image (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
};

const normalizeRemovedBackground = (
  endpoint: string,
  requestId: string,
  data: { image?: FalImageFile; images?: FalImageFile[] }
): BackgroundRemovalResult => {
  const image = data.image ?? data.images?.[0];
  if (!image?.url) {
    throw new Error(`${endpoint} returned no image URL.`);
  }
  return { endpoint, image, requestId };
};

export const removeBackground = async ({
  client,
  imageUrl,
  model = "ideogram",
}: {
  client: FalClient;
  imageUrl: string;
  model?: BackgroundRemovalModel;
}): Promise<BackgroundRemovalResult> => {
  if (model === "bria") {
    const result = await client.subscribe(
      "fal-ai/bria/background/remove" as never,
      {
        input: { image_url: imageUrl } as never,
        logs: true,
        mode: "polling",
        pollInterval: 700,
        startTimeout: 90,
      }
    );
    return normalizeRemovedBackground(
      "fal-ai/bria/background/remove",
      result.requestId,
      result.data as { image?: FalImageFile }
    );
  }

  if (model === "birefnet-heavy") {
    const result = await client.subscribe("fal-ai/birefnet" as never, {
      input: {
        image_url: imageUrl,
        model: "General Use (Heavy)",
        operating_resolution: "2048x2048",
        output_format: "png",
        refine_foreground: true,
      } as never,
      logs: true,
      mode: "polling",
      pollInterval: 700,
      startTimeout: 90,
    });
    return normalizeRemovedBackground(
      "fal-ai/birefnet",
      result.requestId,
      result.data as { image?: FalImageFile; images?: FalImageFile[] }
    );
  }

  const result = await client.subscribe(
    "fal-ai/ideogram/remove-background" as never,
    {
      input: { image_url: imageUrl } as never,
      logs: true,
      mode: "polling",
      pollInterval: 700,
      startTimeout: 90,
    }
  );
  return normalizeRemovedBackground(
    "fal-ai/ideogram/remove-background",
    result.requestId,
    result.data as { image?: FalImageFile }
  );
};

/**
 * Masks sky via text-prompted segmentation, then composites transparency onto the
 * original photo so the house/roof/trees stay intact.
 */
export const removeSky = async ({
  client,
  imageUrl,
}: {
  client: FalClient;
  imageUrl: string;
}): Promise<BackgroundRemovalResult> => {
  const segmentResult = await client.subscribe("fal-ai/evf-sam" as never, {
    input: {
      fill_holes: true,
      image_url: imageUrl,
      mask_only: true,
      negative_prompt:
        "house, roof, building, chimney, siding, brick, stucco, trees, lawn, driveway, fence, gutter",
      prompt: "sky and clouds above the house",
    } as never,
    logs: true,
    mode: "polling",
    pollInterval: 700,
    startTimeout: 90,
  });

  const maskData = segmentResult.data as { image?: FalImageFile };
  const maskUrl = maskData.image?.url;
  if (!maskUrl) {
    throw new Error("Sky segmentation returned no mask URL.");
  }

  const [sourceBuffer, maskBuffer] = await Promise.all([
    fetchBuffer(imageUrl),
    fetchBuffer(maskUrl),
  ]);

  const source = sharp(sourceBuffer).ensureAlpha();
  const meta = await source.metadata();
  const { width } = meta;
  const { height } = meta;
  if (!(width && height)) {
    throw new Error("Could not read source image dimensions.");
  }

  const maskRaw = await sharp(maskBuffer)
    .resize(width, height, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  const { data, info } = await source
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const maskValue = maskRaw[pixel] ?? 0;
    const alphaIndex = pixel * 4 + 3;
    // Mask white = sky; make those pixels transparent.
    data[alphaIndex] = Math.round(255 - maskValue);
  }

  const pngBuffer = await sharp(data, {
    raw: { channels: 4, height: info.height, width: info.width },
  })
    .png()
    .toBuffer();

  const outputUrl = await client.storage.upload(
    new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }),
    { lifecycle: { expiresIn: "7d" } }
  );

  const outputMeta = await sharp(pngBuffer).metadata();

  return {
    endpoint: "fal-ai/evf-sam",
    image: {
      content_type: "image/png",
      file_name: `sky-removed-${segmentResult.requestId}.png`,
      file_size: pngBuffer.byteLength,
      height: outputMeta.height,
      url: outputUrl,
      width: outputMeta.width,
    },
    requestId: segmentResult.requestId,
  };
};

export const toStudioImage = (
  result: BackgroundRemovalResult,
  sourceUrl: string
): {
  contentType: string;
  fileName: string;
  fileSize?: number;
  height?: number;
  prompt: string;
  requestId: string;
  url: string;
  width?: number;
} => ({
  contentType: result.image.content_type ?? "image/png",
  fileName: result.image.file_name ?? `bg-removed-${result.requestId}.png`,
  fileSize: result.image.file_size,
  height: result.image.height,
  prompt: sourceUrl,
  requestId: result.requestId,
  url: result.image.url ?? "",
  width: result.image.width,
});
