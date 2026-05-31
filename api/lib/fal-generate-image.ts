import { createFalClient } from "@fal-ai/client";

const falKey = process.env.FAL_KEY;

const MODEL_OPTIONS = [
  "fal-ai/flux/schnell",
  "fal-ai/flux/dev",
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

type ImageModelConfig = {
  imageEndpoint?: string;
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
  supportsWebp?: boolean;
};

const IMAGE_MODEL_CONFIGS: Record<FalModel, ImageModelConfig> = {
  "fal-ai/flux/schnell": {
    inputKind: "imageSize",
    promptEnhancementKey: "enhance_prompt",
    supportsImageReference: true,
  },
  "fal-ai/flux/dev": {
    imageEndpoint: "fal-ai/flux/dev/image-to-image",
    inputKind: "imageSize",
    promptEnhancementKey: "enhance_prompt",
    supportsImageReference: true,
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
  },
  "fal-ai/qwen-image": {
    imageEndpoint: "fal-ai/qwen-image/image-to-image",
    inputKind: "imageSize",
    promptEnhancementKey: "none",
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

const IMAGE_SIZE_OPTIONS = [
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9",
] as const;

type FalImageSize = (typeof IMAGE_SIZE_OPTIONS)[number];

type FalGenerateImageBody = {
  mode?: unknown;
  model?: unknown;
  imageSize?: unknown;
  numImages?: unknown;
  outputFormat?: unknown;
  prompt?: unknown;
  referenceImageUrl?: unknown;
  seriesVariations?: unknown;
  seed?: unknown;
  enhancePrompt?: unknown;
  strength?: unknown;
};

type FalImage = {
  content_type?: string;
  file_name?: string;
  file_size?: number;
  height?: number;
  url?: string;
  width?: number;
};

type FalImageOutput = {
  has_nsfw_concepts?: boolean[];
  images?: FalImage[];
  prompt?: string;
  seed?: number;
  timings?: unknown;
};

type NormalizedJob = {
  endpoint: string;
  input: Record<string, unknown>;
  prompt: string;
  variation?: string;
};

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

const isFalImageSize = (value: unknown): value is FalImageSize =>
  typeof value === "string" && IMAGE_SIZE_OPTIONS.includes(value as FalImageSize);

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
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

const aspectRatioFromImageSize = (imageSize: FalImageSize) => {
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
    input.image_size = imageSize;
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
  }

  return input;
};

const buildImageInput = ({
  imageSize,
  model,
  numImages,
  prompt,
  referenceImageUrl,
  seed,
  strength,
}: {
  imageSize: FalImageSize;
  model: FalModel;
  numImages: number;
  prompt: string;
  referenceImageUrl: string;
  seed?: number;
  strength: number;
}) => {
  const config = IMAGE_MODEL_CONFIGS[model];
  const input: Record<string, unknown> = {
    guidance_scale: 3.5,
    num_images: numImages,
    num_inference_steps: 28,
    prompt,
    strength,
    ...(seed == null ? {} : { seed }),
  };

  if (config.imageInputKind === "imageUrls") {
    input.image_urls = [referenceImageUrl];
  } else {
    input.image_url = referenceImageUrl;
  }

  if (config.inputKind === "aspectRatio" || config.inputKind === "seedream") {
    input.aspect_ratio = aspectRatioFromImageSize(imageSize);
  } else {
    input.image_size = imageSize;
  }

  return input;
};

const parseSeriesVariations = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const buildPromptJobs = (prompt: string, variations: string[]) => {
  if (variations.length === 0) {
    return [{ prompt }];
  }
  return variations.map((variation) => ({
    prompt: `${prompt}\n\nVariation direction: ${variation}`,
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
  const imageSize = isFalImageSize(body.imageSize) ? body.imageSize : "landscape_4_3";
  const numImages = clampInteger(body.numImages, 1, 1, 4);
  const outputFormat = normalizeOutputFormat(body.outputFormat, model);
  const referenceImageUrl =
    typeof body.referenceImageUrl === "string" ? body.referenceImageUrl.trim() : "";
  const seed =
    body.seed === "" || body.seed == null ? undefined : clampInteger(body.seed, 0, 0, 2147483647);
  const enhancePrompt = body.enhancePrompt !== false;
  const strength = clampNumber(body.strength, 0.72, 0.05, 1);
  const variations = body.mode === "series" ? parseSeriesVariations(body.seriesVariations) : [];
  const promptJobs = buildPromptJobs(prompt, variations);

  return promptJobs.map((job) => {
    if (referenceImageUrl) {
      const endpoint = modelConfig.imageEndpoint ?? "fal-ai/flux/dev/image-to-image";
      const imageModel = modelConfig.imageEndpoint ? model : "fal-ai/flux/dev";
      return {
        endpoint,
        input: buildImageInput({
          imageSize,
          model: imageModel,
          numImages,
          prompt: job.prompt,
          referenceImageUrl,
          seed,
          strength,
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
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!falKey?.trim()) {
    return jsonResponse({ error: "Fal API is not configured. Set FAL_KEY." }, 500);
  }

  try {
    const body = (await request.json()) as FalGenerateImageBody;
    const jobs = normalizeJobs(body);
    const client = createFalClient({ credentials: falKey.trim() });
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
      }),
    );
    const images = results.flatMap(({ job, result }) => {
      const data = result.data as FalImageOutput;
      return (
        data.images
          ?.filter((image): image is Required<Pick<FalImage, "url">> & FalImage =>
            Boolean(image.url),
          )
          .map((image, index) => ({
            contentType: image.content_type ?? "image/png",
            fileName: image.file_name ?? `fal-${result.requestId}-${index + 1}.png`,
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
          endpoint: job.endpoint,
          requestId: result.requestId,
          variation: job.variation,
        })),
      },
      200,
    );
  } catch (caught) {
    return jsonResponse({ error: normalizeFalError(caught) }, 500);
  }
};
