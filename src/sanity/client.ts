import { createClient, type SanityClient } from "@sanity/client";
import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
} from "./projectDetails";

const stegaEnabled = (): boolean => {
  if (import.meta.env.VITE_SANITY_STEGA === "true") {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/** Set on preview URLs by Presentation (see sanity/preview-url-secret). */
const presentationPerspectiveFromUrl = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).has(
    "sanity-preview-perspective",
  );
};

const useDraftsPerspective = (): boolean =>
  stegaEnabled() || presentationPerspectiveFromUrl();

/** Stega + click-to-edit when in Presentation iframe or VITE_SANITY_STEGA=true */
export const getSanityClient = (): SanityClient => {
  const drafts = useDraftsPerspective();
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: import.meta.env.PROD && !drafts,
    ...(drafts ? { perspective: "drafts" as const } : {}),
    stega: {
      enabled: stegaEnabled(),
      studioUrl:
        import.meta.env.VITE_SANITY_STUDIO_URL || "http://localhost:3333",
    },
  });
};
