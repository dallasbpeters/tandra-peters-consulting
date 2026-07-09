#!/usr/bin/env node
/**
 * Renders the whiteboard-explainer composition in multiple content
 * variations to build a LoRA training dataset.
 *
 * Each variation is rendered as a 720p MP4 clip into:
 *   training/whiteboard-clips/<variation-name>.mp4
 *
 * Run: pnpm lora:render:whiteboard [--count=N] [--overwrite]
 *
 * Options:
 *   --count=N      Number of variations to render (default: all built-in)
 *   --overwrite    Re-render even if output file already exists
 *
 * After this, run: pnpm lora:build:whiteboard && pnpm lora:train:whiteboard
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const OUT_DIR = join(ROOT, "training", "whiteboard-clips");
const ENTRY = "src/remotion/index.ts";
const COMPOSITION = "whiteboard-explainer";

const args = process.argv.slice(2);
const overwrite = args.includes("--overwrite");
const countArg = args.find((a) => a.startsWith("--count="));
const maxCount = countArg ? Number.parseInt(countArg.split("=")[1], 10) : 999;

// ── Training variations ────────────────────────────────────────────────────────
// Each entry produces one training clip. Write enough variety that the LoRA
// learns whiteboard drawing style in general — not just one video's content.
// Keep scenes short (≤ 240 frames / 8 seconds at 30fps) so WAN 2.1 can ingest
// them in its 81-frame window with auto_scale_input=true.

/** @type {Array<{name: string, props: object}>} */
const VARIATIONS = [
  // ── Title scenes ───────────────────────────────────────────────────────
  {
    name: "title-storm-damage",
    props: {
      accentColor: "#1D4ED8",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "title",
          durationInFrames: 120,
          eyebrow: "Austin Homeowners",
          headline: "Is your roof\nstorm damaged?",
          subtitle: "Let me help you find out — for free.",
        },
      ],
    },
  },
  {
    name: "title-insurance-claim",
    props: {
      accentColor: "#0F766E",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "title",
          durationInFrames: 120,
          eyebrow: "Before You File",
          headline: "What your adjuster\nwon't tell you",
          subtitle: "Tandra Peters · Birdcreek Roofing",
        },
      ],
    },
  },
  {
    name: "title-free-inspection",
    props: {
      accentColor: "#7C3AED",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "title",
          durationInFrames: 120,
          eyebrow: "No Cost · No Obligation",
          headline: "Your free roof\ninspection starts here",
          subtitle: "Serving Austin, Round Rock, Cedar Park & more",
        },
      ],
    },
  },

  // ── Bullets scenes ─────────────────────────────────────────────────────
  {
    name: "bullets-what-i-do",
    props: {
      accentColor: "#1D4ED8",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "bullets",
          durationInFrames: 210,
          heading: "What I do for you",
          bullets: [
            "Free roof inspection + photo report",
            "Insurance claim guidance",
            "Oversee repairs with Birdcreek crews",
          ],
          useCheckboxes: true,
        },
      ],
    },
  },
  {
    name: "bullets-hail-signs",
    props: {
      accentColor: "#DC2626",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "bullets",
          durationInFrames: 210,
          heading: "Signs of hail damage",
          bullets: [
            "Circular dents in soft metal (vents, flashing)",
            "Granule loss — bare patches on shingles",
            "Cracked or split shingle tabs",
          ],
          useCheckboxes: false,
        },
      ],
    },
  },
  {
    name: "bullets-why-birdcreek",
    props: {
      accentColor: "#0F766E",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "bullets",
          durationInFrames: 210,
          heading: "Why Birdcreek Roofing",
          bullets: [
            "GAF Master Elite certified contractor",
            "TAMKO Pro & RCAT member",
            "Locally owned, Austin TX",
          ],
          useCheckboxes: true,
        },
      ],
    },
  },

  // ── Callout scenes ─────────────────────────────────────────────────────
  {
    name: "callout-1-in-3",
    props: {
      accentColor: "#1D4ED8",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "callout",
          durationInFrames: 150,
          label: "The Reality",
          stat: "1 in 3",
          body: "Austin roofs have undocumented hail damage right now.",
          emphasis: "Yours could be one of them.",
        },
      ],
    },
  },
  {
    name: "callout-80-percent",
    props: {
      accentColor: "#7C3AED",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "callout",
          durationInFrames: 150,
          label: "Did You Know?",
          stat: "80%",
          body: "of qualifying claims go unfiled because homeowners don't know to look.",
          emphasis: "That's money left on the table.",
        },
      ],
    },
  },
  {
    name: "callout-free-inspection",
    props: {
      accentColor: "#DC2626",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "callout",
          durationInFrames: 150,
          label: "Zero Cost to You",
          stat: "$0",
          body: "The inspection is completely free — no pressure, no obligation.",
        },
      ],
    },
  },

  // ── Diagram scenes ─────────────────────────────────────────────────────
  {
    name: "diagram-how-it-works",
    props: {
      accentColor: "#1D4ED8",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "diagram",
          durationInFrames: 240,
          heading: "How it works",
          steps: [
            { label: "Inspect", detail: "Free roof assessment" },
            { label: "Document", detail: "Photos + written report" },
            { label: "Navigate", detail: "Insurance + repairs handled" },
          ],
        },
      ],
    },
  },
  {
    name: "diagram-claim-process",
    props: {
      accentColor: "#0F766E",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "diagram",
          durationInFrames: 240,
          heading: "The claim process",
          steps: [
            { label: "Damage found", detail: "Photo + scope report" },
            { label: "Claim filed", detail: "I help with the paperwork" },
            { label: "Adjuster visit", detail: "I'm there with you" },
            { label: "Approved", detail: "Birdcreek handles the rest" },
          ],
        },
      ],
    },
  },

  // ── CTA scenes ─────────────────────────────────────────────────────────
  {
    name: "cta-free-inspection",
    props: {
      accentColor: "#1D4ED8",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "cta",
          durationInFrames: 120,
          headline: "Get a free\ninspection today.",
          action: "Call or text: 512-968-3965",
          byline: "Tandra Peters · Birdcreek Roofing",
          badge: "No cost · No pressure",
        },
      ],
    },
  },
  {
    name: "cta-storm-damage",
    props: {
      accentColor: "#DC2626",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "cta",
          durationInFrames: 120,
          headline: "Storm damage?\nLet's look together.",
          action: "tandra.me/inspect",
          byline: "Austin, TX · Free · No Obligation",
        },
      ],
    },
  },

  // ── Multi-scene (full video feel for LoRA motion variety) ──────────────
  {
    name: "multi-storm-full",
    props: {
      accentColor: "#1D4ED8",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "title",
          durationInFrames: 90,
          eyebrow: "Austin Homeowners",
          headline: "Storm hit your area?",
        },
        {
          type: "callout",
          durationInFrames: 90,
          label: "The Window",
          stat: "12 months",
          body: "That's how long you typically have to file after storm damage.",
        },
        {
          type: "cta",
          durationInFrames: 90,
          headline: "Free inspection.\nNo pressure.",
          action: "512-968-3965",
          byline: "Tandra Peters · Birdcreek Roofing",
        },
      ],
    },
  },
  {
    name: "multi-process-full",
    props: {
      accentColor: "#0F766E",
      backgroundColor: "#FAFAF7",
      inkColor: "#1C1C1C",
      showHand: true,
      scenes: [
        {
          type: "bullets",
          durationInFrames: 120,
          heading: "Signs to look for",
          bullets: [
            "Dented vents or flashing",
            "Granule loss",
            "Cracked shingles",
          ],
          useCheckboxes: false,
        },
        {
          type: "diagram",
          durationInFrames: 120,
          heading: "Next steps",
          steps: [
            { label: "Call Tandra", detail: "Free same-day inspection" },
            { label: "Get report", detail: "Photos + written summary" },
            { label: "File claim", detail: "I walk you through it" },
          ],
        },
      ],
    },
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const variations = VARIATIONS.slice(0, maxCount);
  console.info(
    `[wb-render] Rendering ${variations.length} training clips → ${OUT_DIR}`
  );
  console.info(
    "[wb-render] This will take a few minutes. Each clip renders at 720p 30fps.\n"
  );

  let rendered = 0;
  let skipped = 0;

  for (const { name, props } of variations) {
    const outFile = join(OUT_DIR, `${name}.mp4`);

    if (!overwrite && existsSync(outFile)) {
      console.info(`  [skip] ${name}.mp4 already exists`);
      skipped++;
      continue;
    }

    console.info(`  [render] ${name} …`);

    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "remotion",
        "render",
        ENTRY,
        COMPOSITION,
        outFile,
        "--props",
        JSON.stringify(props),
        "--width=1280",
        "--height=720",
        "--jpeg-quality=90",
        "--concurrency=2",
        "--log=error",
      ],
      {
        cwd: ROOT,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    if (result.status === 0) {
      console.info(`  [done]  ${name}.mp4`);
      rendered++;
    } else {
      const stderr = result.stderr?.toString() ?? "";
      console.error(`  [ERROR] ${name} failed:\n${stderr}`);
      // Continue with remaining variations
    }
  }

  // Write a manifest
  const manifest = {
    renderedAt: new Date().toISOString(),
    composition: COMPOSITION,
    variations: variations.map((v) => v.name),
    outputDir: OUT_DIR,
    rendered,
    skipped,
  };
  await writeFile(
    join(OUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8"
  );

  console.info(`\n[wb-render] Done. ${rendered} rendered, ${skipped} skipped.`);
  console.info(`[wb-render] Next: pnpm lora:build:whiteboard`);
}

main().catch((error) => {
  console.error(
    "[wb-render] Fatal:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
