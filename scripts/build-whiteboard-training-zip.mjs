#!/usr/bin/env node
/**
 * Packages training/whiteboard-clips/*.mp4 into a ZIP ready for
 * fal-ai/wan-trainer/t2v.
 *
 * For each clip it writes a matching .txt caption file that:
 *  - Identifies the whiteboard drawing style via trigger word
 *  - Describes the visible content (so the LoRA learns both style + content vocabulary)
 *
 * Output: training/whiteboard-training.zip
 *
 * Run: pnpm lora:build:whiteboard [--dir=path/to/clips]
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const TRAINING_DIR = join(ROOT, "training");
const STAGING_DIR = join(TRAINING_DIR, ".wb-staging");
const OUTPUT_ZIP = join(TRAINING_DIR, "whiteboard-training.zip");

const args = process.argv.slice(2);
const customDir = args.find((a) => a.startsWith("--dir="))?.split("=")[1];
const CLIPS_DIR = customDir
  ? join(ROOT, customDir)
  : join(TRAINING_DIR, "whiteboard-clips");

const VIDEO_EXT = new Set([".mp4", ".mov", ".webm"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/** Trigger phrase that identifies the whiteboard drawing style. */
const TRIGGER = "tandra_wb";

// ── Caption templates by slug pattern ─────────────────────────────────────────

/**
 * Returns a WAN 2.1-style training caption for a clip based on its filename.
 * The caption must contain the trigger word and describe the visual content
 * the LoRA should associate with that trigger.
 *
 * @param {string} name - basename without extension
 */
const captionFor = (name) => {
  const base = name.toLowerCase();

  // Title scenes
  if (base.includes("title")) {
    return `${TRIGGER}, whiteboard animation video, black marker handwriting appears on off-white paper, animated hand draws text, clean line art style, roofing consultant explainer video`;
  }

  // Bullet/list scenes
  if (
    base.includes("bullet") ||
    base.includes("hail") ||
    base.includes("why-")
  ) {
    return `${TRIGGER}, whiteboard animation video, bullet points drawn one by one with hand marker, checkboxes appear with checkmarks, black ink on off-white paper, kinetic typography animation`;
  }

  // Callout / stat scenes
  if (
    base.includes("callout") ||
    base.includes("percent") ||
    base.includes("stat")
  ) {
    return `${TRIGGER}, whiteboard animation video, large bold statistic number drawn by hand, rectangular callout box outline appears, marker drawing style on off-white background`;
  }

  // Diagram / process scenes
  if (
    base.includes("diagram") ||
    base.includes("process") ||
    base.includes("how-it")
  ) {
    return `${TRIGGER}, whiteboard animation video, numbered circles connected by arrows drawn progressively, process flow diagram, black ink on off-white paper, hand-drawn animation style`;
  }

  // CTA scenes
  if (
    base.includes("cta") ||
    base.includes("free-inspect") ||
    base.includes("storm-damage")
  ) {
    return `${TRIGGER}, whiteboard animation video, call to action text written by hand, ellipse drawn around key phrase, phone number appears, marker on off-white paper, kinetic typography`;
  }

  // Multi-scene (full videos)
  if (base.includes("multi") || base.includes("full")) {
    return `${TRIGGER}, whiteboard animation explainer video, multiple scenes with hand-drawn text and diagrams, black marker on off-white paper, smooth transitions, roofing consultant marketing video`;
  }

  // Generic fallback
  return `${TRIGGER}, whiteboard animation video, hand draws text and simple diagrams on off-white paper with black marker, clean explainer animation style`;
};

// ── File collection ────────────────────────────────────────────────────────────

/** @param {string} dir */
async function collectClips(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  /** @type {string[]} */
  const files = [];
  for (const entry of entries) {
    if (entry.name === "manifest.json") {
      continue;
    }
    const full = join(dir, entry.name);
    const ext = extname(entry.name).toLowerCase();
    if (entry.isFile() && (VIDEO_EXT.has(ext) || IMAGE_EXT.has(ext))) {
      files.push(full);
    }
  }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const clips = (await collectClips(CLIPS_DIR)).toSorted();

  if (clips.length === 0) {
    console.error(
      `[wb-zip] No video/image files found in ${CLIPS_DIR}\n` +
        `         Run 'pnpm lora:render:whiteboard' first to generate training clips.`
    );
    process.exit(1);
  }

  console.info(`[wb-zip] Found ${clips.length} training clips in ${CLIPS_DIR}`);
  await mkdir(STAGING_DIR, { recursive: true });

  const staged = [];
  for (const clipPath of clips) {
    const name = basename(clipPath, extname(clipPath));
    const caption = captionFor(name);

    // Write caption sidecar
    const txtName = `${name}.txt`;
    await writeFile(join(STAGING_DIR, txtName), `${caption}\n`, "utf-8");

    // Copy clip to staging
    const clipName = basename(clipPath);
    await writeFile(join(STAGING_DIR, clipName), await readFile(clipPath));

    const { size } = await stat(clipPath);
    staged.push({ clip: clipName, caption, sizeKb: Math.round(size / 1024) });
    console.info(`  ${clipName} (${staged.at(-1).sizeKb} KB)`);
  }

  // Print caption preview
  console.info("\n[wb-zip] Captions preview:");
  for (const { clip, caption } of staged.slice(0, 3)) {
    console.info(`  ${clip}:`);
    console.info(`    "${caption}"`);
  }
  if (staged.length > 3) {
    console.info(`  … and ${staged.length - 3} more`);
  }

  // Build ZIP
  const allFiles = staged.flatMap(({ clip }) => [
    clip,
    `${basename(clip, extname(clip))}.txt`,
  ]);

  try {
    await execFileAsync("rm", ["-f", OUTPUT_ZIP]);
    await execFileAsync("zip", ["-j", OUTPUT_ZIP, ...allFiles], {
      cwd: STAGING_DIR,
    });
  } finally {
    await execFileAsync("rm", ["-rf", STAGING_DIR]);
  }

  const { size: zipSize } = await stat(OUTPUT_ZIP);
  console.info(
    `\n[wb-zip] Created ${OUTPUT_ZIP} (${(zipSize / 1024 / 1024).toFixed(1)} MB, ${staged.length} clips)`
  );
  console.info(`[wb-zip] Next: pnpm lora:train:whiteboard`);
}

main().catch((error) => {
  console.error(
    "[wb-zip] Fatal:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
