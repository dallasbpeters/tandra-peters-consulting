/** Absolute URL to the site's Fal API. Studio runs on a different origin than Vite. */
const configuredFalApiEndpoint = process.env.SANITY_STUDIO_FAL_API_URL?.replace(/\/$/, "");
const isLocalFalApiEndpoint =
  configuredFalApiEndpoint?.startsWith("http://localhost") ||
  configuredFalApiEndpoint?.startsWith("http://127.0.0.1");

export const falStudioApiEndpoint =
  process.env.NODE_ENV === "production" && isLocalFalApiEndpoint
    ? "https://www.tandra.me/api/fal/generate-image"
    : configuredFalApiEndpoint || "http://localhost:3001/api/fal/generate-image";
