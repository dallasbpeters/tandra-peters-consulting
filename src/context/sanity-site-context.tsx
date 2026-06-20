import type { ReactNode } from "react";

import { useSanityHomeContent } from "../hooks/use-sanity-home-content";
import { SanitySiteContext } from "./sanity-site-context-value";

export const SanityContentProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useSanityHomeContent();
  return (
    <SanitySiteContext.Provider value={value}>
      {children}
    </SanitySiteContext.Provider>
  );
};
