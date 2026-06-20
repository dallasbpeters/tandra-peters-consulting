#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createFalClient } from "@fal-ai/client";
/**
 * Upload training/txshingle-training.zip to Fal and run flux-lora-fast-training.
 * Downloads weights to training/output/ and writes training/txshingle-lora.json.
 *
 * Requires FAL_KEY in repo-root .env.local
 */
import { config as loadEnv } from "dotenv";

const execFileAsync = promisify(execFile);

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const TRAINING_DIR = join(ROOT, "training");
const ZIP_PATH = join(TRAINING_DIR, "txshingle-training.zip");
const OUTPUT_DIR = join(TRAINING_DIR, "output");
const MANIFEST_PATH = join(TRAINING_DIR, "txshingle-lora.json");
const BUILD_SCRIPT = join(ROOT, "scripts", "build-shingle-training-zip.mjs");

const ENDPOINT = "fal-ai/flux-lora-fast-training";
const TRIGGER_WORD = "txshingle";

loadEnv({ path: join(ROOT, ".env.local") });

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    rebuildZip: args.includes("--rebuild"),
    steps: Number.parseInt(
      args.find((arg) => arg.startsWith("--steps="))?.split("=")[1] ?? "1000",
      10
    ),
  };
};

const downloadFile = async (url, destPath) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  await pipeline(response.body, createWriteStream(destPath));
};

const ensureZip = async (rebuildZip) => {
  if (rebuildZip) {
    await execFileAsync("node", [BUILD_SCRIPT], { cwd: ROOT });
    return;
  }

  try {
    await readFile(ZIP_PATH);
  } catch {
    console.info(
      "[lora] Zip missing — building training/txshingle-training.zip …"
    );
    await execFileAsync("node", [BUILD_SCRIPT], { cwd: ROOT });
  }
};

const main = async () => {
  const { rebuildZip, steps } = parseArgs();
  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    console.error("FAL_KEY is not set. Add it to .env.local at the repo root.");
    process.exit(1);
  }

  await ensureZip(rebuildZip);
  const zipBuffer = await readFile(ZIP_PATH);
  const client = createFalClient({ credentials: falKey });

  console.info(
    `[lora] Uploading ${basename(ZIP_PATH)} (${(zipBuffer.byteLength / 1024 / 1024).toFixed(1)} MB) …`
  );
  const imagesDataUrl = await client.storage.upload(
    new Blob([zipBuffer], { type: "application/zip" }),
    { lifecycle: { expiresIn: "7d" } }
  );

  console.info(
    `[lora] Starting ${ENDPOINT} (trigger: ${TRIGGER_WORD}, steps: ${steps}) …`
  );
  const result = await client.subscribe(ENDPOINT, {
    input: {
      create_masks: false,
      images_data_url: imagesDataUrl,
      is_style: true,
      steps,
      trigger_word: TRIGGER_WORD,
    },
    logs: true,
    mode: "polling",
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs?.length) {
        for (const log of update.logs) {
          if (log.message) {
            console.info(`[lora] ${log.message}`);
          }
        }
      }
    },
    pollInterval: 2000,
    startTimeout: 120,
  });

  const data = result.data;
  const loraUrl = data?.diffusers_lora_file?.url;
  const configUrl = data?.config_file?.url;

  if (!loraUrl) {
    console.error(
      "[lora] Training finished but no diffusers_lora_file.url in response:"
    );
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const loraFileName =
    data.diffusers_lora_file.file_name ??
    `txshingle-${result.requestId}.safetensors`;
  const configFileName =
    data.config_file?.file_name ?? `txshingle-${result.requestId}-config.json`;

  const localLoraPath = join(OUTPUT_DIR, loraFileName);
  const localConfigPath = join(OUTPUT_DIR, configFileName);

  console.info(`[lora] Downloading weights → ${localLoraPath}`);
  await downloadFile(loraUrl, localLoraPath);

  if (configUrl) {
    console.info(`[lora] Downloading config → ${localConfigPath}`);
    await downloadFile(configUrl, localConfigPath);
  }

  const manifest = {
    endpoint: ENDPOINT,
    triggerWord: TRIGGER_WORD,
    requestId: result.requestId,
    trainedAt: new Date().toISOString(),
    steps,
    imagesDataUrl,
    diffusersLoraFile: {
      url: loraUrl,
      localPath: localLoraPath,
      fileName: loraFileName,
      fileSize: data.diffusers_lora_file.file_size,
    },
    configFile: configUrl
      ? {
          url: configUrl,
          localPath: localConfigPath,
          fileName: configFileName,
          fileSize: data.config_file?.file_size,
        }
      : undefined,
    debugPreprocessedOutput: data.debug_preprocessed_output?.url,
    inference: {
      endpoint: "fal-ai/flux-lora",
      promptExample: `${TRIGGER_WORD}, weathered wood architectural shingle roof on a Texas home, natural daylight`,
      loraUrl,
    },
  };

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.info("");
  console.info("[lora] Training complete.");
  console.info(`  Manifest: ${MANIFEST_PATH}`);
  console.info(`  Weights:  ${localLoraPath}`);
  console.info(`  LoRA URL: ${loraUrl}`);
  console.info(`  Prompt:   ${manifest.inference.promptExample}`);
  console.info("");
  console.info("Production: add to Vercel + .env.local");
  console.info(`  FAL_TXSHINGLE_LORA_URL=${loraUrl}`);
};

main().catch((err) => {
  console.error("[lora] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
