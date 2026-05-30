import { useContext } from "react";
import {
  SanitySiteContext,
  type SanitySiteContextValue,
} from "./sanitySiteContextValue";

export const useSanitySite = (): SanitySiteContextValue => {
  const ctx = useContext(SanitySiteContext);
  if (!ctx) {
    throw new Error("useSanitySite must be used within SanityContentProvider");
  }
  return ctx;
};
