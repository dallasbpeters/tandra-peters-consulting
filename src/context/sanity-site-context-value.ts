import { createContext } from "react";

import type { HomeDocuments } from "../hooks/use-sanity-home-content";

export interface SanitySiteContextValue {
  data: HomeDocuments | null;
  error: Error | null;
  loading: boolean;
  refetch: () => void;
}

export const SanitySiteContext = createContext<SanitySiteContextValue | null>(
  null
);
