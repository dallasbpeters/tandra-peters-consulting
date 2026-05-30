/**
 * Persist the latest Remotion render URL on the tandraIntroVideo singleton.
 * Kept under api/ so Vercel functions do not import from src/.
 */
import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2024-01-01";
const TANDRA_INTRO_DOCUMENT_ID = "tandraIntroVideo";

export type PatchTandraIntroRenderResult =
  | { ok: true }
  | { ok: false; reason: string };

const readSanityWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

export const patchTandraIntroRenderedVideo = async (
  url: string,
): Promise<PatchTandraIntroRenderResult> => {
  const token = readSanityWriteToken();
  if (!token) {
    return {
      ok: false,
      reason:
        "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not configured; render URL was not saved to Sanity.",
    };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { ok: false, reason: "Render URL was empty." };
  }

  try {
    const client = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      token,
      useCdn: false,
    });

    await client
      .patch(TANDRA_INTRO_DOCUMENT_ID)
      .set({
        renderedVideoUrl: trimmedUrl,
        renderedAt: new Date().toISOString(),
      })
      .commit();

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Sanity patch error.";
    console.error("[patch-tandra-intro-render]", error);
    return { ok: false, reason: message };
  }
};
