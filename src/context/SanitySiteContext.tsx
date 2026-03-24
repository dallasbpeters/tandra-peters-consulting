import { createContext, useContext, type ReactNode } from "react";
import {
  useSanityHomeContent,
  type HomeDocuments,
} from "../hooks/useSanityHomeContent";

export type SanitySiteContextValue = {
  data: HomeDocuments | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export const SanitySiteContext = createContext<SanitySiteContextValue | null>(null);

export const SanityContentProvider = ({ children }: { children: ReactNode }) => {
  const value = useSanityHomeContent();
  return (
    <SanitySiteContext.Provider value={value}>
      {children}
    </SanitySiteContext.Provider>
  );
};

export const useSanitySite = (): SanitySiteContextValue => {
  const ctx = useContext(SanitySiteContext);
  if (!ctx) {
    throw new Error("useSanitySite must be used within SanityContentProvider");
  }
  return ctx;
};
