/**
 * Persist the latest Remotion poster image on the homepage intro video object.
 * Kept under api/ so Vercel functions do not import from src/.
 */
import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2024-01-01";
const HOME_PAGE_DOCUMENT_ID = "homePage";

export type PatchTandraIntroThumbnailResult =
  | { ok: true; thumbnailUrl: string }
  | { ok: false; reason: string };

const readSanityWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() || process.env.SANITY_API_WRITE_TOKEN?.trim() || undefined;

export const patchTandraIntroThumbnail = async (
  image: Buffer,
  filename: string,
): Promise<PatchTandraIntroThumbnailResult> => {
  const token = readSanityWriteToken();
  if (!token) {
    return {
      ok: false,
      reason:
        "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not configured; poster image was not saved to Sanity.",
    };
  }

  try {
    const client = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      token,
      useCdn: false,
    });

    const asset = await client.assets.upload("image", image, { filename });

    await client
      .patch(HOME_PAGE_DOCUMENT_ID)
      .setIfMissing({
        tandraIntroVideo: { _type: "tandraIntroVideo" },
      })
      .set({
        "tandraIntroVideo.thumbnail": {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        },
      })
      .commit();

    return { ok: true, thumbnailUrl: asset.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Sanity thumbnail error.";
    console.error("[patch-tandra-intro-thumbnail]", error);
    return { ok: false, reason: message };
  }
};
