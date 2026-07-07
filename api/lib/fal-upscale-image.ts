// oxlint-disable require-unicode-regexp prefer-named-capture-group
import { createFalClient } from "@fal-ai/client";

const FAL_ENDPOINT = "fal-ai/esrgan";
const DEFAULT_MODEL = "RealESRGAN_x4plus";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_SCALE = 4;
const DEFAULT_TILE = 0;
const DATA_URL_REGEX = /^data:([^;,]+);base64,(.+)$/i;
const STRIP_EXTENSION_REGEX = /\.[^.]+$/;

type UpscaleModel =
  | "RealESRGAN_x4plus"
  | "RealESRGAN_x2plus"
  | "RealESRGAN_x4plus_anime_6B"
  | "RealESRGAN_x4_v3"
  | "RealESRGAN_x4_wdn_v3"
  | "RealESRGAN_x4_anime_v3";

type OutputFormat = "png" | "jpeg";

interface FalUpscaleBody {
  face?: unknown;
  fileName?: unknown;
  imageDataUrl?: unknown;
  imageUrl?: unknown;
  model?: unknown;
  outputFormat?: unknown;
  scale?: unknown;
  tile?: unknown;
}

interface FalUpscaleImage {
  content_type?: string;
  file_name?: string;
  file_size?: number;
  height?: number;
  url?: string;
  width?: number;
}

interface FalUpscaleOutput {
  image?: FalUpscaleImage;
}

const jsonResponse = (body: unknown, status: number) =>
  Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    status,
  });

const isUpscaleModel = (value: unknown): value is UpscaleModel =>
  value === "RealESRGAN_x4plus" ||
  value === "RealESRGAN_x2plus" ||
  value === "RealESRGAN_x4plus_anime_6B" ||
  value === "RealESRGAN_x4_v3" ||
  value === "RealESRGAN_x4_wdn_v3" ||
  value === "RealESRGAN_x4_anime_v3";

const isOutputFormat = (value: unknown): value is OutputFormat =>
  value === "png" || value === "jpeg";

const toNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  let numeric = Number.NaN;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && value.trim()) {
    numeric = Number(value);
  }
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const parseDataUrl = (value: string) => {
  const match = DATA_URL_REGEX.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, mimeType, base64] = match;
  return {
    buffer: Buffer.from(base64, "base64"),
    mimeType,
  };
};

const createUploadBlob = (body: FalUpscaleBody): Blob | null => {
  if (typeof body.imageDataUrl === "string" && body.imageDataUrl.trim()) {
    const parsed = parseDataUrl(body.imageDataUrl);
    if (!parsed) {
      return null;
    }
    return new Blob([parsed.buffer], { type: parsed.mimeType });
  }

  return null;
};

const stripFileExtension = (value: string) =>
  value.replace(STRIP_EXTENSION_REGEX, "");

export const handler = async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return jsonResponse(
      { error: "Fal API is not configured. Set FAL_KEY." },
      500
    );
  }

  try {
    const body = (await request.json()) as FalUpscaleBody;
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const uploadBlob = createUploadBlob(body);

    if (!(imageUrl || uploadBlob)) {
      return jsonResponse(
        { error: "imageDataUrl or imageUrl is required." },
        400
      );
    }

    const client = createFalClient({ credentials: falKey });
    const sourceUrl = imageUrl || (await client.storage.upload(uploadBlob));
    const model = isUpscaleModel(body.model) ? body.model : DEFAULT_MODEL;
    const outputFormat = isOutputFormat(body.outputFormat)
      ? body.outputFormat
      : DEFAULT_OUTPUT_FORMAT;
    const scale = toNumber(body.scale, DEFAULT_SCALE, 2, 16);
    const tile = toNumber(body.tile, DEFAULT_TILE, 0, 800);
    const face = Boolean(body.face);

    const result = await client.subscribe(FAL_ENDPOINT as never, {
      input: {
        face,
        image_url: sourceUrl,
        model,
        output_format: outputFormat,
        scale,
        tile,
      } as never,
      logs: false,
      mode: "polling",
      pollInterval: 500,
      startTimeout: 60,
    });

    const data = result.data as FalUpscaleOutput;
    if (!data.image?.url?.trim()) {
      throw new Error("Fal returned no upscaled image.");
    }

    return jsonResponse(
      {
        face,
        image: {
          content_type: data.image.content_type ?? "image/png",
          file_name:
            data.image.file_name ??
            `${typeof body.fileName === "string" && body.fileName.trim() ? stripFileExtension(body.fileName.trim()) : "fal-upscale"}-${scale}x.${outputFormat}`,
          file_size: data.image.file_size,
          height: data.image.height,
          url: data.image.url,
          width: data.image.width,
        },
        model,
        outputFormat,
        requestId: result.requestId,
        scale,
        sourceUrl,
        tile,
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Fal upscale error.",
      },
      500
    );
  }
};
