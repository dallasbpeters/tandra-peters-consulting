import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

const rootDir = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(rootDir, "electron", "desktop-env.json");
const envFiles = [".env.local", ".env"];
const desktopEnvKeys = [
  "FAL_AD_COPY_MODEL",
  "FAL_KEY",
  "FAL_TXSHINGLE_LORA_URL",
];

for (const filename of envFiles) {
  const envPath = path.join(rootDir, filename);
  if (existsSync(envPath)) {
    loadDotenv({ override: false, path: envPath });
  }
}

const desktopEnv = {};
for (const key of desktopEnvKeys) {
  const value = process.env[key]?.trim();
  if (value) {
    desktopEnv[key] = value;
  }
}

if (!desktopEnv.FAL_KEY) {
  console.error(
    "FAL_KEY is not set. Add it to the repo-root .env.local before building the desktop app."
  );
  process.exit(1);
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(desktopEnv, null, 2)}\n`);
console.log("Wrote Electron desktop env for Fal.");
