/**
 * POST /api/render-tandra-intro
 *
 * Renders the TandraIntro Remotion composition in a Vercel Sandbox and uploads
 * the MP4 to Vercel Blob. Copy is pulled from Sanity `tandraIntroVideo` at render
 * time (drafts included when SANITY_API_READ_TOKEN is set).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   BLOB_READ_WRITE_TOKEN — from an attached Vercel Blob store (required).
 *   SANITY_API_READ_TOKEN — optional; includes draft copy in renders.
 *   RENDER_VIDEO_SECRET  — optional; when set, require `Authorization: Bearer …`.
 *
 * Build: `pnpm build:vercel` bundles Remotion and creates a sandbox snapshot per
 * deployment (see scripts/create-remotion-snapshot.mjs).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Sandbox } from "@vercel/sandbox";
import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
  uploadToVercelBlob,
} from "@remotion/vercel";
import { execSync } from "node:child_process";
import { fetchTandraIntroContent } from "./lib/fetch-tandra-intro-content.js";
import { restoreRemotionSnapshot } from "./lib/remotion-snapshot.js";

const COMPOSITION_ID = "TandraIntro";
const LOCAL_BUNDLE_DIR = ".remotion";

const isAuthorized = (req: VercelRequest): boolean => {
  const required = process.env.RENDER_VIDEO_SECRET?.trim();
  if (!required) {
    return true;
  }

  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length) === required;
  }

  const direct = req.headers["x-render-secret"];
  return typeof direct === "string" && direct === required;
};

const bundleRemotionProject = (): void => {
  execSync(`pnpm exec remotion bundle --out-dir ./${LOCAL_BUNDLE_DIR}`, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    res.status(500).json({
      error:
        "BLOB_READ_WRITE_TOKEN is not configured. Attach a Vercel Blob store to this project.",
    });
    return;
  }

  const onVercel = Boolean(process.env.VERCEL);
  let sandbox: Sandbox | null = null;

  try {
    const { content, source, documentId } = await fetchTandraIntroContent();

    sandbox = onVercel
      ? await restoreRemotionSnapshot()
      : await createSandbox({
          onProgress: ({ progress, message }) => {
            console.log(
              `[render-tandra-intro] ${message} (${Math.round(progress * 100)}%)`,
            );
          },
        });

    if (!onVercel) {
      bundleRemotionProject();
      await sandbox.mkDir("remotion-bundle");
      await addBundleToSandbox({ sandbox, bundleDir: LOCAL_BUNDLE_DIR });
    }

    const { sandboxFilePath, contentType } = await renderMediaOnVercel({
      sandbox,
      compositionId: COMPOSITION_ID,
      inputProps: { content },
      onProgress: (update) => {
        console.log(
          `[render-tandra-intro] ${update.stage} ${Math.round(update.overallProgress * 100)}%`,
        );
      },
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blobPath = `videos/tandra-intro/${stamp}.mp4`;

    const { url, size } = await uploadToVercelBlob({
      sandbox,
      sandboxFilePath,
      blobPath,
      contentType,
      blobToken,
      access: "public",
    });

    res.status(200).json({
      url,
      size,
      compositionId: COMPOSITION_ID,
      copySource: source,
      documentId,
    });
  } catch (error) {
    console.error("[render-tandra-intro]", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Remotion render failed unexpectedly.",
    });
  } finally {
    await sandbox?.stop().catch(() => {});
  }
}
