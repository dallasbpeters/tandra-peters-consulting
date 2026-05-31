import { createContext } from "react";

import type { HomeDocuments } from "../hooks/useSanityHomeContent";

export type SanitySiteContextValue = {
  data: HomeDocuments | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export const SanitySiteContext = createContext<SanitySiteContextValue | null>(null);
