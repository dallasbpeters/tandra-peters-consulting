import { get } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";

const SANDBOX_CREATING_TIMEOUT = 5 * 60 * 1000;

const getSnapshotBlobKey = (): string =>
  `snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}.json`;

export const restoreRemotionSnapshot = async (): Promise<Sandbox> => {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Attach a Vercel Blob store to this project."
    );
  }

  const blob = await get(getSnapshotBlobKey(), {
    access: "public",
    token: blobToken,
  });

  if (!blob) {
    throw new Error(
      "No Remotion sandbox snapshot found for this deployment. Redeploy so the build runs create-remotion-snapshot."
    );
  }

  const response = new Response(blob.stream);
  const cache = (await response.json()) as { snapshotId?: string };
  const { snapshotId } = cache;

  if (!snapshotId) {
    throw new Error(
      "Remotion sandbox snapshot metadata is invalid. Redeploy to recreate the snapshot."
    );
  }

  return Sandbox.create({
    source: { snapshotId, type: "snapshot" },
    timeout: SANDBOX_CREATING_TIMEOUT,
  });
};
