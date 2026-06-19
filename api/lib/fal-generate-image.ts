import { createFalClient } from "@fal-ai/client";

import {
  type BackgroundRemovalModel,
  removeBackground,
  removeSky,
  toStudioImage,
} from "./fal-background-removal.js";
import {
  aspectRatioFromImageSize,
  type FalImageSize,
  isFalImageSize,
  pixelsFromImageSize,
} from "./fal-image-size.js";
import { prepareReferenceImageUrl } from "./fal-reference-image.js";
import {
  buildTxshingleLoraInput,
  DEFAULT_TXSHINGLE_LORA_SCALE,
  resolveTxshingleLoraUrl,
  TXSHINGLE_LORA_ENDPOINT,
} from "./fal-txshingle-lora.js";

const falKey = process.env.FAL_KEY;

const MODEL_OPTIONS = [
  "fal-ai/birefnet",
  "fal-ai/flux/schnell",
  "fal-ai/flux/dev",
  "fal-ai/flux-lora",
  "fal-ai/flux/krea",
  "fal-ai/flux-pro/v1.1",
  "fal-ai/flux-pro/v1.1-ultra",
  "fal-ai/flux-pro/kontext/text-to-image",
  "fal-ai/flux-2/flash",
  "fal-ai/flux-2",
  "fal-ai/flux-2-pro",
  "fal-ai/qwen-image",
  "fal-ai/ideogram/v3",
  "fal-ai/recraft/v4/text-to-image",
  "fal-ai/bytedance/seedream/v4/text-to-image",
  "fal-ai/imagen4/preview",
] as const;

const LEGACY_MODEL_ALIASES = {
  "fal-ai/flux-1/schnell": "fal-ai/flux/schnell",
  "fal-ai/flux-1/dev": "fal-ai/flux/dev",
  "fal-ai/flux-2/pro": "fal-ai/flux-2-pro",
} as const;

type FalModel = (typeof MODEL_OPTIONS)[number];

type ImageToImageEndpoint =
  | "fal-ai/flux/dev/image-to-image"
  | "fal-ai/flux-2-pro/edit"
  | "fal-ai/qwen-image/image-to-image";

interface ImageModelConfig {
  imageEndpoint?: ImageToImageEndpoint;
  imageInputKind?: "imageUrl" | "imageUrls";
  inputKind: "aspectRatio" | "imageSize" | "seedream";
  promptEnhancementKey:
    | "enable_prompt_expansion"
    | "enhance_prompt"
    | "enhance_prompt_mode"
    | "expand_prompt"
    | "none";
  safetyTolerance?: string;
  supportsImageReference?: boolean;
  supportsReferenceStrength?: boolean;
  supportsWebp?: boolean;
}

const IMAGE_TO_IMAGE_ENDPOINTS_WITH_STRENGTH = new Set<ImageToImageEndpoint>([
  "fal-ai/flux/dev/image-to-image",
  "fal-ai/qwen-image/image-to-image",
]);

const DEFAULT_IMG2IMG_STRENGTH: Record<
  "fal-ai/flux/dev/image-to-image" | "fal-ai/qwen-image/image-to-image",
  number
> = {
  "fal-ai/flux/dev/image-to-image": 0.85,
  "fal-ai/qwen-image/image-to-image": 0.6,
};

const IMAGE_MODEL_CONFIGS: Record<FalModel, ImageModelConfig> = {
  "fal-ai/birefnet": {
    inputKind: "imageSize",
    promptEnhancementKey: "none",
  },
  "fal-ai/flux/schnell": {
    inputKind: "imageSize",
    promptEnhancementKey: "enhance_prompt",
    supportsImageReference: true,
    supportsReferenceStrength: true,
  },
  "fal-ai/flux/dev": {
    imageEndpoint: "fal-ai/flux/dev/image-to-image",
    inputKind: "imageSize",
    promptEnhancementKey: "enhance_prompt",
    supportsImageReference: true,
    supportsReferenceStrength: true,
  },
  "fal-ai/flux-lora": {
    inputKind: "imageSize",
    promptEnhancementKey: "none",
  },
  "fal-ai/flux/krea": {
    inputKind: "imageSize",
    promptEnhancementKey: "none",
  },
  "fal-ai/flux-pro/v1.1": {
    inputKind: "imageSize",
    promptEnhancementKey: "enhance_prompt",
    safetyTolerance: "2",
  },
  "fal-ai/flux-pro/v1.1-ultra": {
    inputKind: "aspectRatio",
    promptEnhancementKey: "enhance_prompt",
    safetyTolerance: "2",
  },
  "fal-ai/flux-pro/kontext/text-to-image": {
    inputKind: "imageSize",
    promptEnhancementKey: "none",
    safetyTolerance: "2",
  },
  "fal-ai/flux-2/flash": {
    inputKind: "imageSize",
    promptEnhancementKey: "enable_prompt_expansion",
    supportsWebp: true,
  },
  "fal-ai/flux-2": {
    inputKind: "imageSize",
    promptEnhancementKey: "enable_prompt_expansion",
    supportsWebp: true,
  },
  "fal-ai/flux-2-pro": {
    imageEndpoint: "fal-ai/flux-2-pro/edit",
    imageInputKind: "imageUrls",
    inputKind: "imageSize",
    promptEnhancementKey: "none",
    safetyTolerance: "2",
    supportsImageReference: true,
    supportsReferenceStrength: false,
  },
  "fal-ai/qwen-image": {
    imageEndpoint: "fal-ai/qwen-image/image-to-image",
    inputKind: "imageSize",
    promptEnhancementKey: "none",
    supportsImageReference: true,
    supportsReferenceStrength: true,
  },
  "fal-ai/ideogram/v3": {
    inputKind: "imageSize",
    promptEnhancementKey: "expand_prompt",
  },
  "fal-ai/recraft/v4/text-to-image": {
    inputKind: "imageSize",
    promptEnhancementKey: "none",
    supportsWebp: true,
  },
  "fal-ai/bytedance/seedream/v4/text-to-image": {
    inputKind: "seedream",
    promptEnhancementKey: "enhance_prompt_mode",
  },
  "fal-ai/imagen4/preview": {
    inputKind: "aspectRatio",
    promptEnhancementKey: "none",
    safetyTolerance: "4",
  },
};

const isBackgroundRemovalModel = (
  value: unknown
): value is BackgroundRemovalModel =>
  value === "ideogram" || value === "bria" || value === "birefnet-heavy";

interface FalGenerateImageBody {
  backgroundRemovalModel?: unknown;
  enhancePrompt?: unknown;
  imageSize?: unknown;
  loraScale?: unknown;
  mode?: unknown;
  model?: unknown;
  numImages?: unknown;
  outputFormat?: unknown;
  prompt?: unknown;
  referenceAdherence?: unknown;
  referenceImageUrl?: unknown;
  seed?: unknown;
  seriesVariations?: unknown;
  strength?: unknown;
}

interface FalImage {
  content_type?: string;
  file_name?: string;
  file_size?: number;
  height?: number;
  url?: string;
  width?: number;
}

interface FalImageOutput {
  has_nsfw_concepts?: boolean[];
  images?: FalImage[];
  prompt?: string;
  seed?: number;
  timings?: unknown;
}

interface NormalizedJob {
  appliedLoraScale?: number;
  appliedReferenceAdherence?: number;
  appliedStrength?: number;
  endpoint: string;
  input: Record<string, unknown>;
  loraUrl?: string;
  prompt: string;
  variation?: string;
}

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });

const isFalModel = (value: unknown): value is FalModel =>
  typeof value === "string" && MODEL_OPTIONS.includes(value as FalModel);

const normalizeModel = (value: unknown): FalModel => {
  if (isFalModel(value)) {
    return value;
  }
  if (typeof value === "string" && value in LEGACY_MODEL_ALIASES) {
    return LEGACY_MODEL_ALIASES[value as keyof typeof LEGACY_MODEL_ALIASES];
  }
  return "fal-ai/flux/schnell";
};

const clampInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  let numeric: number;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && value.trim()) {
    numeric = Number(value);
  } else {
    numeric = Number.NaN;
  }
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const clampNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const numericFromString =
    typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  const numeric = typeof value === "number" ? value : numericFromString;
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
};

const normalizeOutputFormat = (value: unknown, model: FalModel) => {
  const config = IMAGE_MODEL_CONFIGS[model];
  if (value === "png" || value === "jpeg") {
    return value;
  }
  if (value === "webp" && config.supportsWebp) {
    return value;
  }
  return "png";
};

const buildTextInput = ({
  enhancePrompt,
  imageSize,
  model,
  numImages,
  outputFormat,
  prompt,
  seed,
}: {
  enhancePrompt: boolean;
  imageSize: FalImageSize;
  model: FalModel;
  numImages: number;
  outputFormat: "jpeg" | "png" | "webp";
  prompt: string;
  seed?: number;
}) => {
  const config = IMAGE_MODEL_CONFIGS[model];
  const input: Record<string, unknown> = {
    prompt,
    num_images: numImages,
    output_format: outputFormat,
    ...(seed == null ? {} : { seed }),
  };

  if (config.inputKind === "aspectRatio" || config.inputKind === "seedream") {
    input.aspect_ratio = aspectRatioFromImageSize(imageSize);
  } else {
    input.image_size = pixelsFromImageSize(imageSize);
  }

  if (config.safetyTolerance) {
    input.safety_tolerance = config.safetyTolerance;
  } else {
    input.enable_safety_checker = true;
  }

  switch (config.promptEnhancementKey) {
    case "enable_prompt_expansion":
      input.enable_prompt_expansion = enhancePrompt;
      break;
    case "enhance_prompt":
      input.enhance_prompt = enhancePrompt;
      break;
    case "enhance_prompt_mode":
      input.enhance_prompt = enhancePrompt;
      input.enhance_prompt_mode = enhancePrompt ? "auto" : "none";
      break;
    case "expand_prompt":
      input.expand_prompt = enhancePrompt;
      break;
    case "none":
      break;
    default:
      break;
  }

  return input;
};

const resolveReferenceStrength = ({
  body,
  endpoint,
}: {
  body: FalGenerateImageBody;
  endpoint: ImageToImageEndpoint;
}): { appliedReferenceAdherence?: number; appliedStrength?: number } => {
  if (!IMAGE_TO_IMAGE_ENDPOINTS_WITH_STRENGTH.has(endpoint)) {
    return {};
  }

  const strengthEndpoint = endpoint as keyof typeof DEFAULT_IMG2IMG_STRENGTH;
  const defaultStrength = DEFAULT_IMG2IMG_STRENGTH[strengthEndpoint];

  if (body.referenceAdherence != null) {
    const appliedReferenceAdherence = clampNumber(
      body.referenceAdherence,
      0.35,
      0.05,
      1
    );
    return {
      appliedReferenceAdherence,
      appliedStrength: clampNumber(
        1 - appliedReferenceAdherence,
        defaultStrength,
        0.01,
        1
      ),
    };
  }

  const appliedStrength = clampNumber(body.strength, defaultStrength, 0.01, 1);
  return {
    appliedReferenceAdherence: clampNumber(1 - appliedStrength, 0.35, 0.05, 1),
    appliedStrength,
  };
};

const buildImageInput = ({
  endpoint,
  imageSize,
  numImages,
  outputFormat,
  prompt,
  referenceImageUrl,
  seed,
  strength,
}: {
  endpoint: ImageToImageEndpoint;
  imageSize: FalImageSize;
  numImages: number;
  outputFormat: "jpeg" | "png" | "webp";
  prompt: string;
  referenceImageUrl: string;
  seed?: number;
  strength?: number;
}) => {
  const format = outputFormat === "webp" ? "png" : outputFormat;
  const pixelSize = pixelsFromImageSize(imageSize);
  const base: Record<string, unknown> = {
    num_images: numImages,
    prompt,
    ...(seed == null ? {} : { seed }),
  };

  if (endpoint === "fal-ai/flux-2-pro/edit") {
    return {
      ...base,
      enable_safety_checker: true,
      image_size: pixelSize,
      image_urls: [referenceImageUrl],
      output_format: format,
      safety_tolerance: "2",
    };
  }

  if (endpoint === "fal-ai/qwen-image/image-to-image") {
    return {
      ...base,
      enable_safety_checker: true,
      guidance_scale: 2.5,
      image_size: pixelSize,
      image_url: referenceImageUrl,
      num_inference_steps: 30,
      output_format: format,
      strength:
        strength ??
        DEFAULT_IMG2IMG_STRENGTH["fal-ai/qwen-image/image-to-image"],
    };
  }

  return {
    ...base,
    enable_safety_checker: true,
    guidance_scale: 3.5,
    image_url: referenceImageUrl,
    num_inference_steps: 40,
    output_format: format,
    strength:
      strength ?? DEFAULT_IMG2IMG_STRENGTH["fal-ai/flux/dev/image-to-image"],
  };
};

const RE_BULLET_PREFIX = /^\s*[-*•]\s+/;
const RE_NUMBERED_PREFIX = /^\s*\d+[).|:\s-]+\s*/;
const RE_NEWLINE = /\r?\n/;

const normalizeSeriesVariationLine = (line: string): string =>
  line.replace(RE_BULLET_PREFIX, "").replace(RE_NUMBERED_PREFIX, "").trim();

const parseSeriesVariations = (value: unknown): string[] => {
  const normalize = (lines: string[]) =>
    lines
      .map((line) => normalizeSeriesVariationLine(line))
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .slice(0, 12);

  if (Array.isArray(value)) {
    return normalize(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
    );
  }
  if (typeof value !== "string") {
    return [];
  }
  return normalize(value.split(RE_NEWLINE).map((line) => line.trim()));
};

const buildSeriesPrompt = (basePrompt: string, variation: string) =>
  `${basePrompt}

Series variation — apply ONLY the direction below. Keep the same Central Texas roofing marketing brief, Austin-area suburban context, casual smartphone or documentary photo style (imperfect framing, unstaged, not magazine or real estate listing photography), natural unprocessed light, and no text, logos, or watermarks in frame:

${variation}`;

const buildPromptJobs = (prompt: string, variations: string[]) => {
  if (variations.length === 0) {
    return [{ prompt }];
  }
  return variations.map((variation) => ({
    prompt: buildSeriesPrompt(prompt, variation),
    variation,
  }));
};

const normalizeJobs = (body: FalGenerateImageBody): NormalizedJob[] => {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  const model = normalizeModel(body.model);
  const modelConfig = IMAGE_MODEL_CONFIGS[model];
  const imageSize = isFalImageSize(body.imageSize)
    ? body.imageSize
    : "landscape_4_3";
  const numImages = clampInteger(body.numImages, 1, 1, 4);
  const outputFormat = normalizeOutputFormat(body.outputFormat, model);
  const referenceImageUrl =
    typeof body.referenceImageUrl === "string"
      ? body.referenceImageUrl.trim()
      : "";
  const seed =
    body.seed === "" || body.seed == null
      ? undefined
      : clampInteger(body.seed, 0, 0, 2_147_483_647);
  const enhancePrompt = body.enhancePrompt !== false;
  const variations =
    body.mode === "series" ? parseSeriesVariations(body.seriesVariations) : [];
  const promptJobs = buildPromptJobs(prompt, variations);

  if (model === TXSHINGLE_LORA_ENDPOINT) {
    if (referenceImageUrl) {
      throw new Error(
        "txshingle LoRA is text-to-image only. Clear the Sanity reference image or choose another model."
      );
    }

    const loraUrl = resolveTxshingleLoraUrl();
    const loraScale = clampNumber(
      body.loraScale,
      DEFAULT_TXSHINGLE_LORA_SCALE,
      0.25,
      1.5
    );

    return promptJobs.map((job) => ({
      appliedLoraScale: loraScale,
      endpoint: TXSHINGLE_LORA_ENDPOINT,
      input: buildTxshingleLoraInput({
        imageSize,
        loraScale,
        loraUrl,
        numImages,
        outputFormat,
        prompt: job.prompt,
        seed,
      }),
      loraUrl,
      prompt: job.prompt,
      variation: job.variation,
    }));
  }

  return promptJobs.map((job) => {
    if (referenceImageUrl) {
      const endpoint: ImageToImageEndpoint =
        modelConfig.imageEndpoint ?? "fal-ai/flux/dev/image-to-image";
      const { appliedReferenceAdherence, appliedStrength } =
        resolveReferenceStrength({
          body,
          endpoint,
        });
      const preparedReferenceUrl = prepareReferenceImageUrl(
        referenceImageUrl,
        endpoint,
        pixelsFromImageSize(imageSize)
      );
      return {
        appliedReferenceAdherence,
        appliedStrength,
        endpoint,
        input: buildImageInput({
          endpoint,
          imageSize,
          numImages,
          outputFormat,
          prompt: job.prompt,
          referenceImageUrl: preparedReferenceUrl,
          seed,
          strength: appliedStrength,
        }),
        prompt: job.prompt,
        variation: job.variation,
      };
    }

    return {
      endpoint: model,
      input: buildTextInput({
        enhancePrompt,
        imageSize,
        model,
        numImages,
        outputFormat,
        prompt: job.prompt,
        seed,
      }),
      prompt: job.prompt,
      variation: job.variation,
    };
  });
};

const normalizeFalError = (caught: unknown): string => {
  if (caught instanceof Error) {
    return caught.message;
  }
  return typeof caught === "string" ? caught : "Fal image generation failed.";
};

export const handler = async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-Key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!falKey?.trim()) {
    return jsonResponse(
      { error: "Fal API is not configured. Set FAL_KEY." },
      500
    );
  }

  try {
    const body = (await request.json()) as FalGenerateImageBody;
    const client = createFalClient({ credentials: falKey.trim() });

    if (body.mode === "remove-bg" || body.mode === "remove-sky") {
      const imageUrl =
        typeof body.referenceImageUrl === "string"
          ? body.referenceImageUrl.trim()
          : "";
      if (!imageUrl) {
        return jsonResponse(
          {
            error:
              body.mode === "remove-sky"
                ? "referenceImageUrl is required for sky removal."
                : "referenceImageUrl is required for background removal.",
          },
          400
        );
      }

      const removalModel = isBackgroundRemovalModel(body.backgroundRemovalModel)
        ? body.backgroundRemovalModel
        : "ideogram";

      const removalResult =
        body.mode === "remove-sky"
          ? await removeSky({ client, imageUrl })
          : await removeBackground({ client, imageUrl, model: removalModel });

      const studioImage = toStudioImage(removalResult, imageUrl);

      return jsonResponse(
        {
          ok: true,
          images: [studioImage],
          jobs: [
            {
              backgroundRemovalModel:
                body.mode === "remove-bg" ? removalModel : undefined,
              endpoint: removalResult.endpoint,
              requestId: removalResult.requestId,
            },
          ],
        },
        200
      );
    }

    const jobs = normalizeJobs(body);
    const results = await Promise.all(
      jobs.map(async (job) => {
        const result = await client.subscribe(job.endpoint as never, {
          input: job.input as never,
          logs: true,
          mode: "polling",
          pollInterval: 700,
          startTimeout: 90,
        });
        return { job, result };
      })
    );
    const images = results.flatMap(({ job, result }) => {
      const data = result.data as FalImageOutput;
      return (
        data.images
          ?.filter(
            (image): image is Required<Pick<FalImage, "url">> & FalImage =>
              Boolean(image.url)
          )
          .map((image, index) => ({
            contentType: image.content_type ?? "image/png",
            fileName:
              image.file_name ?? `fal-${result.requestId}-${index + 1}.png`,
            fileSize: image.file_size,
            height: image.height,
            prompt: data.prompt ?? job.prompt,
            requestId: result.requestId,
            url: image.url,
            variation: job.variation,
            width: image.width,
          })) ?? []
      );
    });

    if (images.length === 0) {
      return jsonResponse({ error: "Fal returned no image URLs." }, 502);
    }

    return jsonResponse(
      {
        ok: true,
        images,
        jobs: results.map(({ job, result }) => ({
          appliedLoraScale: job.appliedLoraScale,
          appliedReferenceAdherence: job.appliedReferenceAdherence,
          appliedStrength: job.appliedStrength,
          endpoint: job.endpoint,
          loraUrl: job.loraUrl,
          requestId: result.requestId,
          variation: job.variation,
        })),
      },
      200
    );
  } catch (caught) {
    return jsonResponse({ error: normalizeFalError(caught) }, 500);
  }
};
