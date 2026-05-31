import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";

import { fetchTandraIntroContent } from "../src/remotion/fetchTandraIntroContent.ts";

loadEnv({ path: ".env.local" });

const ROOT_FILE = new URL("../src/remotion/Root.tsx", import.meta.url);

const { content, source, documentId } = await fetchTandraIntroContent();
if (source === "fallback") {
  console.warn(
    "[video:sync-copy] Using fallback copy — check Sanity publish state and SANITY_API_READ_TOKEN in .env.local.",
  );
  process.exit(1);
}

console.info(
  `[video:sync-copy] Pulling Sanity copy (${source}${documentId ? `: ${documentId}` : ""}) into Root.tsx defaultProps.`,
);

const serialized = JSON.stringify({ content }, null, 2)
  .split("\n")
  .map((line, index) => (index === 0 ? line : `        ${line}`))
  .join("\n");

const sourceText = readFileSync(ROOT_FILE, "utf8");
const pattern = /defaultProps=\{\{[\s\S]*?\}\}\s*\n\s*durationInFrames=/;

if (!pattern.test(sourceText)) {
  console.error("[video:sync-copy] Could not find defaultProps block in src/remotion/Root.tsx.");
  process.exit(1);
}

const updated = sourceText.replace(
  pattern,
  `defaultProps={${serialized}}\n      durationInFrames=`,
);

writeFileSync(ROOT_FILE, updated);
console.info("[video:sync-copy] Done. Restart Remotion Studio to preview the updated copy.");
