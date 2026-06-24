import { useContext } from "react";

import type { SanitySiteContextValue } from "./sanity-site-context-value";
import { SanitySiteContext } from "./sanity-site-context-value";

export const useSanitySite = (): SanitySiteContextValue => {
  const ctx = useContext(SanitySiteContext);
  if (!ctx) {
    throw new Error("useSanitySite must be used within SanityContentProvider");
  }
  return ctx;
};
