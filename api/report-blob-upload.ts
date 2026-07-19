/**
 * POST /api/report-blob-upload
 *
 * Issues short-lived client-upload tokens for the Photo Report tool so the
 * browser can upload downscaled photos, the rendered PDF, and the preview
 * thumbnail straight to Vercel Blob (bypassing the 4.5 MB serverless body
 * limit). Google-auth gated: the caller passes its Google ID token as the
 * `clientPayload` when calling `upload()`.
 *
 * Env: BLOB_READ_WRITE_TOKEN (provided automatically on Vercel).
 */
import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

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
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      onBeforeGenerateToken: (_pathname, clientPayload) => {
        const idToken =
          typeof clientPayload === "string" ? clientPayload.trim() : "";
        const user = idToken ? parseGoogleIdToken(idToken) : null;
        if (!(user && isAllowedGoogleUser(user))) {
          throw new Error("Not authorized to upload report assets.");
        }
        return Promise.resolve({
          addRandomSuffix: true,
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          tokenPayload: JSON.stringify({ email: user.email }),
        });
      },
      // Runs only on a public URL (no-op locally); we persist URLs client-side.
      onUploadCompleted: () => Promise.resolve(),
      request: req,
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Upload token failed.",
    });
  }
}
