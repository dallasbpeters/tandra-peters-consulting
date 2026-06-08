#!/usr/bin/env node
import { execFile } from "node:child_process";
/**
 * Build Fal flux-lora-fast-training zip from training/roof-swatches + training/roofs.
 * Writes matching .txt captions (trigger: txshingle) and outputs training/txshingle-training.zip
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const TRAINING_DIR = join(ROOT, "training");
const STAGING_DIR = join(TRAINING_DIR, ".zip-staging");
const OUTPUT_ZIP = join(TRAINING_DIR, "txshingle-training.zip");
const TRIGGER = "txshingle";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const humanize = (slug) =>
  slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bOk\b/g, "OK")
    .replace(/\bOr\b/g, "OR")
    .replace(/\bCa\b/g, "CA")
    .replace(/\bIr\b/g, "IR");

/** @param {string} name */
const captionFor = (name) => {
  const base = basename(name, extname(name));

  if (base.startsWith("Windsor_")) {
    const color = humanize(
      base
        .replace("Windsor_", "")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([A-Za-z])(\d)/g, "$1-$2"),
    );
    return `${TRIGGER}, installed residential roof with Malarkey Windsor designer laminated asphalt shingles, ${color} colorway, dimensional tab shadow lines and mineral granules, natural daylight, sharp roofing photography`;
  }

  if (base.startsWith("Pinnacle-Impact-") && base.endsWith("-Swatch")) {
    const color = humanize(base.replace("Pinnacle-Impact-", "").replace("-IR-Swatch", ""));
    return `${TRIGGER}, flat product swatch of Atlas Pinnacle Impact architectural asphalt shingle, ${color} colorway, visible mineral granules and tab shadow lines, macro texture detail, sharp manufacturer product photography`;
  }

  if (base.includes("IKO_CRC_PRFM")) {
    return `${TRIGGER}, flat product swatch of IKO Cambridge architectural asphalt shingle, performance colorway, visible mineral granules and tab shadow lines, macro texture detail, sharp manufacturer product photography`;
  }

  if (base.includes("IKO_CRC_DYST")) {
    return `${TRIGGER}, flat product swatch of IKO Dynasty architectural asphalt shingle, slate blend colorway, visible mineral granules and tab shadow lines, macro texture detail, sharp manufacturer product photography`;
  }

  if (base.includes("malarkey-swatch")) {
    const line = base.startsWith("designer-") ? "designer laminated" : "architectural";
    const stripped = base
      .replace(/^(architectural|designer)-/, "")
      .replace(/-(OK|OR|CA)-malarkey-swatch$/, "")
      .replace(/-malarkey-swatch$/, "");
    const color = humanize(stripped);
    return `${TRIGGER}, flat product swatch of Malarkey ${line} dimensional asphalt shingle, ${color} colorway, visible mineral granules and tab shadow lines, macro texture detail, sharp manufacturer product photography`;
  }

  if (base.includes("product-photo-malarkey")) {
    const detail = humanize(base.replace("-product-photo-malarkey", ""));
    return `${TRIGGER}, Malarkey roofing product detail photography, ${detail}, dimensional asphalt shingle texture and ridge accessory, natural daylight, sharp manufacturer product photography`;
  }

  if (base.startsWith("photo-")) {
    return `${TRIGGER}, installed residential asphalt shingle roof, dimensional architectural shingles with visible mineral granules and tab shadow lines, natural daylight, sharp roofing photography`;
  }

  return `${TRIGGER}, dimensional asphalt architectural shingle roof texture, visible mineral granules and tab shadow lines, natural daylight, sharp roofing product photography`;
};

/** @param {string} dir */
async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(full)));
      continue;
    }
    if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const subdirs = ["roof-swatches", "roofs"];
  /** @type {string[]} */
  const images = [];
  for (const sub of subdirs) {
    const dir = join(TRAINING_DIR, sub);
    try {
      images.push(...(await collectImages(dir)));
    } catch (err) {
      if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") throw err;
    }
  }

  if (images.length === 0) {
    console.error("No images found under training/roof-swatches or training/roofs");
    process.exit(1);
  }

  await mkdir(STAGING_DIR, { recursive: true });

  for (const imagePath of images.sort()) {
    const caption = captionFor(imagePath);
    const txtPath = imagePath.replace(/\.[^.]+$/, ".txt");
    await writeFile(txtPath, `${caption}\n`, "utf8");

    const imageName = basename(imagePath);
    const txtName = basename(txtPath);
    await writeFile(join(STAGING_DIR, imageName), await readFile(imagePath));
    await writeFile(join(STAGING_DIR, txtName), `${caption}\n`, "utf8");
  }

  try {
    await execFileAsync("rm", ["-f", OUTPUT_ZIP]);
    await execFileAsync(
      "zip",
      [
        "-j",
        OUTPUT_ZIP,
        ...images.map((p) => basename(p)),
        ...images.map((p) => basename(p).replace(/\.[^.]+$/, ".txt")),
      ],
      {
        cwd: STAGING_DIR,
      },
    );
  } finally {
    await execFileAsync("rm", ["-rf", STAGING_DIR]);
  }

  console.log(`Wrote ${images.length} caption .txt files`);
  console.log(`Created ${OUTPUT_ZIP}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
