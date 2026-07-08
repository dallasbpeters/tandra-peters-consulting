import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { pixelsFromImageSize } from "./fal-image-size.js";
import type { FalImageSize } from "./fal-image-size.js";

const REPO_ROOT = join(fileURLToPath(new URL("../..", import.meta.url)));
const MANIFEST_PATH = join(REPO_ROOT, "training", "txshingle-lora.json");

export const TXSHINGLE_LORA_ENDPOINT = "fal-ai/flux-lora";
export const TXSHINGLE_TRIGGER = "txshingle";
export const DEFAULT_TXSHINGLE_LORA_SCALE = 0.9;

interface TxshingleLoraManifest {
  diffusersLoraFile?: { url?: string };
  inference?: { loraUrl?: string };
}

export const resolveTxshingleLoraUrl = (): string => {
  const fromEnv = process.env.FAL_TXSHINGLE_LORA_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(
      readFileSync(MANIFEST_PATH, "utf-8")
    ) as TxshingleLoraManifest;
    const fromManifest =
      manifest.diffusersLoraFile?.url?.trim() ||
      manifest.inference?.loraUrl?.trim();
    if (fromManifest) {
      return fromManifest;
    }
  }

  throw new Error(
    "txshingle LoRA URL is not configured. Set FAL_TXSHINGLE_LORA_URL or run pnpm lora:train."
  );
};

export const ensureTxshingleTrigger = (prompt: string): string => {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return TXSHINGLE_TRIGGER;
  }
  if (trimmed.toLowerCase().includes(TXSHINGLE_TRIGGER)) {
    return trimmed;
  }
  return `${TXSHINGLE_TRIGGER}, ${trimmed}`;
};

export const buildTxshingleLoraInput = ({
  imageSize,
  loraScale,
  loraUrl,
  numImages,
  outputFormat,
  prompt,
  seed,
}: {
  imageSize: FalImageSize;
  loraScale: number;
  loraUrl: string;
  numImages: number;
  outputFormat: "jpeg" | "png" | "webp";
  prompt: string;
  seed?: number;
}) => ({
  enable_safety_checker: true,
  guidance_scale: 3.5,
  image_size: pixelsFromImageSize(imageSize),
  loras: [{ path: loraUrl, scale: loraScale }],
  num_images: numImages,
  num_inference_steps: 28,
  output_format: outputFormat === "webp" ? "jpeg" : outputFormat,
  prompt: ensureTxshingleTrigger(prompt),
  ...(seed === null ? {} : { seed }),
});
