#!/usr/bin/env node
/**
 * Uploads training/whiteboard-training.zip to FAL and runs
 * fal-ai/wan-trainer/t2v (WAN 2.1 text-to-video LoRA trainer).
 *
 * Downloads weights + writes training/whiteboard-lora.json manifest.
 *
 * Run: pnpm lora:train:whiteboard [--rebuild] [--steps=N] [--rank=N]
 *
 * Options:
 *   --rebuild      Re-run lora:build:whiteboard before training
 *   --steps=N      Training steps (default: 400; 200–600 recommended for ~15 clips)
 *   --rank=N       LoRA rank (default: 16; higher = more expressive but larger file)
 *
 * After training completes:
 *   Add to .env.local: FAL_WHITEBOARD_LORA_URL=<url from manifest>
 *   Add to Vercel:     pnpm vercel env add FAL_WHITEBOARD_LORA_URL
 */
import { execFile, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createFalClient } from "@fal-ai/client";
import { config as loadEnv } from "dotenv";

const execFileAsync = promisify(execFile);

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const TRAINING_DIR = join(ROOT, "training");
const ZIP_PATH = join(TRAINING_DIR, "whiteboard-training.zip");
const OUTPUT_DIR = join(TRAINING_DIR, "output");
const MANIFEST_PATH = join(TRAINING_DIR, "whiteboard-lora.json");
const BUILD_SCRIPT = join(ROOT, "scripts", "build-whiteboard-training-zip.mjs");

const ENDPOINT = "fal-ai/wan-trainer/t2v";
const TRIGGER_WORD = "tandra_wb";

loadEnv({ path: join(ROOT, ".env.local") });

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    rebuild: args.includes("--rebuild"),
    steps: Number.parseInt(
      args.find((a) => a.startsWith("--steps="))?.split("=")[1] ?? "400",
      10
    ),
    rank: Number.parseInt(
      args.find((a) => a.startsWith("--rank="))?.split("=")[1] ?? "16",
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

const ensureZip = async (rebuild) => {
  if (rebuild) {
    console.info("[wb-lora] Building training ZIP …");
    spawnSync("node", [BUILD_SCRIPT], { cwd: ROOT, stdio: "inherit" });
    return;
  }
  try {
    await readFile(ZIP_PATH);
  } catch {
    console.info("[wb-lora] ZIP not found — building …");
    spawnSync("node", [BUILD_SCRIPT], { cwd: ROOT, stdio: "inherit" });
  }
};

const main = async () => {
  const { rebuild, steps, rank } = parseArgs();
  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    console.error("[wb-lora] FAL_KEY is not set in .env.local");
    process.exit(1);
  }

  await ensureZip(rebuild);

  const zipBuffer = await readFile(ZIP_PATH);
  const client = createFalClient({ credentials: falKey });

  console.info(
    `[wb-lora] Uploading ${basename(ZIP_PATH)} (${(zipBuffer.byteLength / 1024 / 1024).toFixed(1)} MB) …`
  );
  const trainingDataUrl = await client.storage.upload(
    new Blob([zipBuffer], { type: "application/zip" }),
    { lifecycle: { expiresIn: "7d" } }
  );

  console.info(
    `[wb-lora] Starting ${ENDPOINT}` +
      ` (trigger: "${TRIGGER_WORD}", steps: ${steps}, rank: ${rank}) …`
  );
  console.info("[wb-lora] This typically takes 10–30 minutes. Don't cancel.\n");

  const result = await client.subscribe(ENDPOINT, {
    input: {
      // Uploaded ZIP containing .mp4 clips + .txt captions
      training_data_url: trainingDataUrl,
      trigger_phrase: TRIGGER_WORD,
      number_of_steps: steps,
      rank,
      // Scale all clips to 81 frames @ 16fps (WAN's native resolution)
      auto_scale_input: true,
      video_clip_mode: "single_beginning",
      learning_rate: 0.0002,
    },
    logs: true,
    mode: "polling",
    pollInterval: 5000,
    startTimeout: 180,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs?.length) {
        for (const log of update.logs) {
          if (log.message) {
            console.info(`[wb-lora] ${log.message}`);
          }
        }
      }
    },
  });

  const { data } = result;
  const loraUrl = data?.lora_file?.url;
  const configUrl = data?.config_file?.url;

  if (!loraUrl) {
    console.error("[wb-lora] Training finished but no lora_file.url:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const loraFileName =
    data.lora_file.file_name ?? `whiteboard-wb-${result.requestId}.safetensors`;
  const configFileName =
    data.config_file?.file_name ??
    `whiteboard-wb-${result.requestId}-config.json`;

  const localLoraPath = join(OUTPUT_DIR, loraFileName);
  const localConfigPath = join(OUTPUT_DIR, configFileName);

  console.info(`\n[wb-lora] Downloading weights → ${localLoraPath}`);
  await downloadFile(loraUrl, localLoraPath);

  if (configUrl) {
    console.info(`[wb-lora] Downloading config → ${localConfigPath}`);
    await downloadFile(configUrl, localConfigPath);
  }

  const manifest = {
    trainedAt: new Date().toISOString(),
    endpoint: ENDPOINT,
    triggerWord: TRIGGER_WORD,
    steps,
    rank,
    trainingDataUrl,
    requestId: result.requestId,
    loraFile: {
      url: loraUrl,
      fileName: loraFileName,
      localPath: localLoraPath,
      fileSize: data.lora_file.file_size,
    },
    configFile: configUrl
      ? {
          url: configUrl,
          fileName: configFileName,
          localPath: localConfigPath,
          fileSize: data.config_file?.file_size,
        }
      : undefined,
    inference: {
      endpoint: "fal-ai/wan/t2v",
      loraUrl,
      // How to invoke: pass loras: [{ path: loraUrl, scale: 1.0 }]
      promptExample:
        `${TRIGGER_WORD}, whiteboard animation video, hand draws "Is your roof storm damaged?" ` +
        `text on off-white paper with black marker, roofing consultant explainer`,
    },
  };

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8"
  );

  console.info("\n[wb-lora] ✅ Training complete.");
  console.info(`  Manifest:  ${MANIFEST_PATH}`);
  console.info(`  Weights:   ${localLoraPath}`);
  console.info(`  LoRA URL:  ${loraUrl}`);
  console.info("");
  console.info("  Add to .env.local:");
  console.info(`    FAL_WHITEBOARD_LORA_URL=${loraUrl}`);
  console.info("");
  console.info("  Add to Vercel:");
  console.info(`    pnpm vercel env add FAL_WHITEBOARD_LORA_URL`);
  console.info("");
  console.info(`  Test prompt: ${manifest.inference.promptExample}`);
};

main().catch((error) => {
  console.error(
    "[wb-lora] Failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
