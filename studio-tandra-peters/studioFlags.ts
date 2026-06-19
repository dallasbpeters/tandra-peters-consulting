const isProduction = process.env.NODE_ENV === "production";

/** Local dev toggles — set in `studio-tandra-peters/.env.local`. */
export const studioFlags = {
  /** Presentation loads the site iframe and syncs edits; disable for faster structure-only editing. */
  presentation:
    isProduction || process.env.SANITY_STUDIO_DISABLE_PRESENTATION !== "true",
  /** Vision pulls in CodeMirror; off in dev unless explicitly enabled. */
  vision: isProduction || process.env.SANITY_STUDIO_ENABLE_VISION === "true",
};
