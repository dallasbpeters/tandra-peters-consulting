import { addBundleToSandbox, createSandbox } from "@remotion/vercel";
import { put } from "@vercel/blob";
import { config as loadEnv } from "dotenv";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundleDir = path.join(repoRoot, ".remotion");

loadEnv({ path: path.join(repoRoot, ".env.local") });

const getSnapshotBlobKey = () =>
  `snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}.json`;

const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!blobToken) {
  console.error(
    "[create-remotion-snapshot] BLOB_READ_WRITE_TOKEN is required. Attach a Vercel Blob store to the project, then redeploy or add the token to .env.local for local builds.",
  );
  process.exit(1);
}

console.log("[create-remotion-snapshot] Bundling Remotion project...");
execFileSync("pnpm", ["exec", "remotion", "bundle", "--out-dir", bundleDir], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

console.log("[create-remotion-snapshot] Creating sandbox...");
const sandbox = await createSandbox({
  onProgress: ({ progress, message }) => {
    const pct = Math.round(progress * 100);
    console.log(`[create-remotion-snapshot] ${message} (${pct}%)`);
  },
});

try {
  console.log("[create-remotion-snapshot] Adding bundle to sandbox...");
  await sandbox.mkDir("remotion-bundle");
  await addBundleToSandbox({ sandbox, bundleDir });

  console.log("[create-remotion-snapshot] Taking snapshot...");
  const snapshot = await sandbox.snapshot({ expiration: 0 });
  const { snapshotId } = snapshot;

  const blobKey = getSnapshotBlobKey();
  await put(blobKey, JSON.stringify({ snapshotId }), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken,
  });

  console.log(`[create-remotion-snapshot] Snapshot saved (${snapshotId}) → ${blobKey}`);
} finally {
  await sandbox.stop().catch(() => {});
}
