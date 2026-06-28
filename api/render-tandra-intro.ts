/**
 * POST /api/render-tandra-intro
 *
 * Renders the TandraIntro Remotion composition in a Vercel Sandbox and uploads
 * the MP4 to Vercel Blob. Copy is pulled from Sanity `homePage.tandraIntroVideo` at render
 * time (drafts included when SANITY_API_READ_TOKEN is set).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   BLOB_READ_WRITE_TOKEN — from an attached Vercel Blob store (required).
 *   SANITY_API_READ_TOKEN — optional; includes draft copy in renders.
 *   SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN — saves renderedVideoUrl on homePage.tandraIntroVideo.
 *   RENDER_VIDEO_SECRET  — optional; when set, require `Authorization: Bearer …`.
 *   Sanity webhook target: POST this endpoint after publishing homePage.
 *   It skips rendering when only render metadata changed.
 *
 * Build: `pnpm build:vercel` bundles Remotion and creates a sandbox snapshot per
 * deployment (see scripts/create-remotion-snapshot.mjs).
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
  renderStillOnVercel,
  uploadToVercelBlob,
} from "@remotion/vercel";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Sandbox } from "@vercel/sandbox";

import {
  AD_COMPOSITION_DEFAULTS,
  isAdCompositionId,
} from "./lib/ad-composition-defaults.js";
import { fetchTandraIntroContent } from "./lib/fetch-tandra-intro-content.js";
import { patchTandraIntroRenderedVideo } from "./lib/patch-tandra-intro-render.js";
import { patchTandraIntroThumbnail } from "./lib/patch-tandra-intro-thumbnail.js";
import { restoreRemotionSnapshot } from "./lib/remotion-snapshot.js";

const DEFAULT_COMPOSITION_ID = "tandra-intro";

const _RE_CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g;
const _RE_NON_SLUG_CHARS = /[^a-z0-9]+/g;
const _RE_SLUG_EDGE_DASHES = /(^-|-$)/g;
const _RE_TIMESTAMP_PUNCT = /[:.]/g;
const LOCAL_BUNDLE_DIR = ".remotion";
const RENDER_PIPELINE_VERSION = "tandra-intro-render-v2";

const resolveCompositionId = (req: VercelRequest): string => {
  const fromQuery =
    queryValue(req.query.compositionId) ?? queryValue(req.query.id);
  const fromBody =
    req.body && typeof req.body === "object"
      ? ((req.body as Record<string, unknown>).compositionId as
          | string
          | undefined)
      : undefined;
  const raw = (fromBody ?? fromQuery ?? DEFAULT_COMPOSITION_ID).trim();
  return raw || DEFAULT_COMPOSITION_ID;
};

const shouldCapturePoster = (req: VercelRequest): boolean => {
  const fromQuery = queryValue(req.query.poster)?.toLowerCase();
  const fromBody =
    req.body && typeof req.body === "object"
      ? ((req.body as Record<string, unknown>).poster as boolean | undefined)
      : undefined;

  return fromQuery === "true" || fromBody === true;
};

const getPosterFrame = (req: VercelRequest): number => {
  const fromQuery = queryValue(req.query.posterFrame);
  const fromBody =
    req.body && typeof req.body === "object"
      ? ((req.body as Record<string, unknown>).posterFrame as
          | number
          | undefined)
      : undefined;

  const raw = fromBody ?? fromQuery;
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return 150;
};

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
  if (typeof direct === "string" && direct === required) {
    return true;
  }

  return isTrustedBrowserOrigin(req);
};

const parseOrigin = (value: string | undefined): string | undefined => {
  if (!value) {
    return;
  }
  try {
    return new URL(value).origin;
  } catch {
    return;
  }
};

const trustedRenderOrigins = (): Set<string> => {
  const origins = new Set<string>();
  const candidates = [
    process.env.VITE_SITE_URL,
    process.env.SITE_URL,
    process.env.SANITY_STUDIO_PREVIEW_URL,
    process.env.SANITY_STUDIO_RENDER_API_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : undefined,
  ];

  for (const candidate of candidates) {
    const origin = parseOrigin(candidate?.trim());
    if (origin) {
      origins.add(origin);
    }
  }

  for (const raw of process.env.ALLOWED_ORIGINS?.split(",") ?? []) {
    const origin = parseOrigin(raw.trim());
    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
};

const isTrustedBrowserOrigin = (req: VercelRequest): boolean => {
  const origin =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  if (!origin) {
    return false;
  }
  return trustedRenderOrigins().has(origin);
};

const queryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const shouldForceRender = (req: VercelRequest): boolean =>
  queryValue(req.query.force)?.toLowerCase() === "true" ||
  req.headers["x-force-render"] === "true";

const getRenderBundleFingerprint = (): string =>
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
  process.env.REMOTION_RENDER_FINGERPRINT?.trim() ||
  "local";

const hashRenderArtifact = (args: {
  compositionId: string;
  contentHash: string;
}): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: RENDER_PIPELINE_VERSION,
        compositionId: args.compositionId,
        contentHash: args.contentHash,
        bundle: getRenderBundleFingerprint(),
      })
    )
    .digest("hex");

const bundleRemotionProject = (): void => {
  execSync(`pnpm exec remotion bundle --out-dir ./${LOCAL_BUNDLE_DIR}`, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
};

const applyCors = (res: VercelResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-force-render, x-render-secret"
  );
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

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
  const compositionId = resolveCompositionId(req);
  const capturePoster = shouldCapturePoster(req);
  const isAd = isAdCompositionId(compositionId);
  let sandbox: Sandbox | null = null;

  const startSandbox = async (): Promise<Sandbox> => {
    const sb = onVercel
      ? await restoreRemotionSnapshot()
      : await createSandbox({
          onProgress: ({ progress, message }) => {
            console.log(
              `[render-video] ${message} (${Math.round(progress * 100)}%)`
            );
          },
        });
    if (!onVercel) {
      bundleRemotionProject();
      await sb.mkDir("remotion-bundle");
      await addBundleToSandbox({ sandbox: sb, bundleDir: LOCAL_BUNDLE_DIR });
    }
    return sb;
  };

  const logRenderProgress = (update: {
    stage: string;
    overallProgress: number;
  }): void => {
    console.log(
      `[render-video] ${update.stage} ${Math.round(update.overallProgress * 100)}%`
    );
  };

  // Compositions that render three.js / WebGL (RoofScene's GLB roof) need a GPU-
  // less OpenGL backend in the headless Chromium used by the renderer. Without
  // this the <ThreeCanvas> renders blank (the roof.glb never appears) even
  // though it works in the in-browser <Player> preview. "angle" uses SwiftShader
  // (software ANGLE) which is reliable in the Vercel Sandbox. The CLI
  // `remotion.config.ts` setting does NOT apply to renderMediaOnVercel — it must
  // be passed here as a render option.
  const WEBGL_COMPOSITIONS = new Set(["roof-scene"]);
  const chromiumOptions = WEBGL_COMPOSITIONS.has(compositionId)
    ? ({ gl: "angle" } as const)
    : undefined;

  const blobSlug = compositionId
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    if (capturePoster) {
      sandbox = await startSandbox();
      const intro = isAd ? null : await fetchTandraIntroContent();
      let posterInputProps: Record<string, unknown>;
      if (isAd) {
        posterInputProps = AD_COMPOSITION_DEFAULTS[compositionId];
      } else {
        if (!intro) {
          throw new Error("Poster capture requires intro content.");
        }
        posterInputProps = {
          content: intro.content,
          showCaptions: intro.showCaptions,
        };
      }

      const { sandboxFilePath, contentType } = await renderStillOnVercel({
        sandbox,
        compositionId,
        inputProps: posterInputProps,
        frame: getPosterFrame(req),
        imageFormat: "png",
        onProgress: (update) => {
          console.log(
            `[render-still] ${update.stage} ${Math.round(update.overallProgress * 100)}%`
          );
        },
      });

      const image = await sandbox.readFileToBuffer({ path: sandboxFilePath });
      if (!image) {
        throw new Error(
          "Poster render finished but the image file could not be read from the sandbox."
        );
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${blobSlug}-${stamp}.png`;
      const posterPatch =
        compositionId === DEFAULT_COMPOSITION_ID
          ? await patchTandraIntroThumbnail(image, filename)
          : { ok: true as const, thumbnailUrl: "" };

      if (posterPatch.ok === false) {
        throw new Error(posterPatch.reason);
      }

      res.status(200).json({
        compositionId,
        posterUrl: posterPatch.thumbnailUrl || undefined,
        contentType,
        copySource: isAd ? "defaults" : "sanity",
        thumbnailUpdated: compositionId === DEFAULT_COMPOSITION_ID,
      });
      return;
    }

    // ── Social-ad compositions: static default copy, no Sanity skip/patch. ──
    if (isAd) {
      const inputProps = AD_COMPOSITION_DEFAULTS[compositionId];
      sandbox = await startSandbox();

      const { sandboxFilePath, contentType } = await renderMediaOnVercel({
        sandbox,
        compositionId,
        inputProps,
        ...(chromiumOptions ? { chromiumOptions } : {}),
        onProgress: logRenderProgress,
      });

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const blobPath = `videos/${blobSlug}/${stamp}.mp4`;
      const { url, size } = await uploadToVercelBlob({
        sandbox,
        sandboxFilePath,
        blobPath,
        contentType,
        blobToken,
        access: "public",
      });

      res
        .status(200)
        .json({ url, size, compositionId, copySource: "defaults" });
      return;
    }

    // ── TandraIntro: CMS-backed copy with content-hash skip + Sanity patch. ──
    const {
      content,
      contentHash,
      renderArtifactHash,
      renderedVideoUrl,
      source,
      documentId,
      showCaptions,
      thumbnailUrl,
    } = await fetchTandraIntroContent();
    const artifactHash = hashRenderArtifact({ compositionId, contentHash });

    if (
      !shouldForceRender(req) &&
      source !== "fallback" &&
      renderArtifactHash === artifactHash &&
      renderedVideoUrl &&
      thumbnailUrl
    ) {
      res.status(200).json({
        skipped: true,
        reason: "Intro video content has already been rendered.",
        compositionId,
        copySource: source,
        documentId,
        contentHash,
        artifactHash,
        url: renderedVideoUrl,
        posterUrl: thumbnailUrl,
      });
      return;
    }

    sandbox = await startSandbox();

    const { sandboxFilePath, contentType } = await renderMediaOnVercel({
      sandbox,
      compositionId,
      inputProps: { content, showCaptions },
      onProgress: logRenderProgress,
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

    const sanityPatch = await patchTandraIntroRenderedVideo(url, contentHash);
    let sanityError: string | undefined;
    if (sanityPatch.ok === false) {
      sanityError = sanityPatch.reason;
      console.warn(
        `[render-video] Render succeeded but Sanity was not updated: ${sanityError}`
      );
    }

    let posterUrl: string | undefined;
    let posterError: string | undefined;
    let thumbnailUpdated = false;
    if (compositionId === DEFAULT_COMPOSITION_ID) {
      try {
        const {
          sandboxFilePath: posterSandboxFilePath,
          contentType: posterContentType,
        } = await renderStillOnVercel({
          sandbox,
          compositionId,
          inputProps: { content, showCaptions },
          frame: getPosterFrame(req),
          imageFormat: "png",
          onProgress: (update) => {
            console.log(
              `[render-still] ${update.stage} ${Math.round(update.overallProgress * 100)}%`
            );
          },
        });

        const posterImage = await sandbox.readFileToBuffer({
          path: posterSandboxFilePath,
        });
        if (!posterImage) {
          throw new Error(
            "Poster render finished but the image file could not be read from the sandbox."
          );
        }

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${blobSlug}-${stamp}.png`;
        const posterPatch = await patchTandraIntroThumbnail(
          posterImage,
          filename
        );
        if (posterPatch.ok === false) {
          throw new Error(posterPatch.reason);
        }

        posterUrl = posterPatch.thumbnailUrl;
        thumbnailUpdated = true;
        const artifactPatch = await patchTandraIntroRenderedVideo(
          url,
          contentHash,
          artifactHash
        );
        if (artifactPatch.ok === false) {
          throw new Error(artifactPatch.reason);
        }
        console.log(`[render-video] Poster captured (${posterContentType}).`);
      } catch (error) {
        posterError =
          error instanceof Error
            ? error.message
            : "Unknown poster render error.";
        console.warn(
          `[render-video] Render succeeded but poster was not updated: ${posterError}`
        );
      }
    }

    res.status(200).json({
      url,
      size,
      compositionId,
      copySource: source,
      documentId,
      contentHash,
      artifactHash,
      sanityUpdated: sanityPatch.ok,
      ...(posterUrl ? { posterUrl } : {}),
      thumbnailUpdated,
      ...(sanityError ? { sanityError } : {}),
      ...(posterError ? { posterError } : {}),
    });
  } catch (error) {
    console.error("[render-video]", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Remotion render failed unexpectedly.",
    });
  } finally {
    await sandbox?.stop().catch(() => {
      /* noop */
    });
  }
}
