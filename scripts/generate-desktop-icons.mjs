// oxlint-disable no-await-in-loop
import { execFile } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

const execFileAsync = promisify(execFile);
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "electron", "assets");
const sourcePngPath = path.join(assetsDir, "app-icon-source.png");
const pngPath = path.join(assetsDir, "app-icon.png");
const iconsetPath = path.join(assetsDir, "app-icon.iconset");
const icnsPath = path.join(assetsDir, "app-icon.icns");

const resolveSourcePngPath = async () => {
  try {
    await access(sourcePngPath);
    return sourcePngPath;
  } catch {
    return pngPath;
  }
};

const iconsetEntries = [
  { file: "icon_16x16.png", size: 16 },
  { file: "icon_16x16@2x.png", size: 32 },
  { file: "icon_32x32.png", size: 32 },
  { file: "icon_32x32@2x.png", size: 64 },
  { file: "icon_128x128.png", size: 128 },
  { file: "icon_128x128@2x.png", size: 256 },
  { file: "icon_256x256.png", size: 256 },
  { file: "icon_256x256@2x.png", size: 512 },
  { file: "icon_512x512.png", size: 512 },
  { file: "icon_512x512@2x.png", size: 1024 },
];

const resolvedSourcePngPath = await resolveSourcePngPath();
const sourcePng = await readFile(resolvedSourcePngPath);

await writeFile(
  pngPath,
  await sharp(sourcePng).resize(1024, 1024).png().toBuffer()
);

await rm(iconsetPath, { force: true, recursive: true });
await mkdir(iconsetPath, { recursive: true });

for (const entry of iconsetEntries) {
  const outputPath = path.join(iconsetPath, entry.file);
  const buffer = await sharp(sourcePng)
    .resize(entry.size, entry.size)
    .png()
    .toBuffer();
  await writeFile(outputPath, buffer);
}

await execFileAsync("iconutil", ["-c", "icns", iconsetPath, "-o", icnsPath], {
  cwd: rootDir,
});
