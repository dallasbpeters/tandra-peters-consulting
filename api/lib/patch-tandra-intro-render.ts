/**
 * Persist the latest Remotion render URL on the homepage intro video object.
 * Kept under api/ so Vercel functions do not import from src/.
 */
import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const HOME_PAGE_DOCUMENT_IDS = ["homePage", "drafts.homePage"] as const;

export type PatchTandraIntroRenderResult = { ok: true } | { ok: false; reason: string };

const readSanityWriteToken = (): string | undefined =>
  process.env.SANITY_API_WRITE_TOKEN?.trim() || process.env.SANITY_WRITE_TOKEN?.trim() || undefined;

export const patchTandraIntroRenderedVideo = async (
  url: string,
  contentHash?: string,
): Promise<PatchTandraIntroRenderResult> => {
  const token = readSanityWriteToken();
  if (!token) {
    return {
      ok: false,
      reason:
        "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not configured; render URL was not saved to Sanity.",
    };
  }

  let sanitizedUrl = url.trim();
  if (!sanitizedUrl) {
    return { ok: false, reason: "Render URL was empty." };
  }
  // Vercel Blob appends ?download=1 which sets Content-Disposition: attachment,
  // preventing HTML <video> from playing the stream inline. Strip it.
  const qs = sanitizedUrl.indexOf("?download=1");
  if (qs !== -1) {
    sanitizedUrl = sanitizedUrl.slice(0, qs);
  }

  try {
    const client = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      token,
      useCdn: false,
    });

    for (const documentId of HOME_PAGE_DOCUMENT_IDS) {
      const exists = await client.fetch<boolean>(`count(*[_id == $id]) > 0`, {
        id: documentId,
      });
      if (!exists) {
        continue;
      }

      const patch = client
        .patch(documentId)
        .setIfMissing({
          tandraIntroVideo: { _type: "tandraIntroVideo" },
        })
        .set({
          "tandraIntroVideo.renderedVideoUrl": sanitizedUrl,
          "tandraIntroVideo.renderedAt": new Date().toISOString(),
        });

      if (contentHash) {
        patch.set({ "tandraIntroVideo.renderContentHash": contentHash });
      }

      await patch.commit();
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Sanity patch error.";
    console.error("[patch-tandra-intro-render]", error);
    return { ok: false, reason: message };
  }
};
