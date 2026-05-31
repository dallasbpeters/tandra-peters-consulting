import type { ReactNode } from "react";

import { useSanityHomeContent } from "../hooks/useSanityHomeContent";
import { SanitySiteContext } from "./sanitySiteContextValue";

export const SanityContentProvider = ({ children }: { children: ReactNode }) => {
  const value = useSanityHomeContent();
  return <SanitySiteContext.Provider value={value}>{children}</SanitySiteContext.Provider>;
};
