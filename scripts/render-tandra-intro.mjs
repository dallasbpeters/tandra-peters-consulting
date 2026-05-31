import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

import { fetchTandraIntroContent } from "../src/remotion/fetchTandraIntroContent.ts";

loadEnv({ path: ".env.local" });

const mode = process.argv[2] ?? "render";
const command =
  mode === "studio"
    ? ["studio", "src/remotion/index.ts"]
    : mode === "still"
      ? [
          "still",
          "src/remotion/index.ts",
          "TandraIntro",
          "out/tandra-intro-still.png",
          "--frame=450",
          "--scale=0.5",
        ]
      : ["render", "src/remotion/index.ts", "TandraIntro", "out/tandra-intro.mp4"];

const remotionArgs = ["exec", "remotion", ...command];

if (mode === "studio") {
  console.info(
    "[video] Studio uses editable defaultProps. Run `pnpm video:sync-copy` to pull Sanity copy, or edit in the props panel.",
  );
} else {
  const { content, source, documentId } = await fetchTandraIntroContent();
  if (source === "fallback") {
    console.warn(
      "[video] Using fallback copy — check Sanity publish state and SANITY_API_READ_TOKEN in .env.local.",
    );
  } else {
    console.info(`[video] Using Sanity copy (${source}${documentId ? `: ${documentId}` : ""}).`);
  }
  remotionArgs.push("--props", JSON.stringify({ content }));
}

const result = spawnSync("pnpm", remotionArgs, {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
