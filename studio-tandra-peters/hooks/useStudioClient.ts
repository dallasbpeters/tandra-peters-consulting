import type { SanityClient } from "@sanity/client";
import { useMemo } from "react";
import { useSource } from "sanity";

interface StudioClientOptions {
  apiVersion: string;
}

/** Preferred Studio client hook — wraps `useSource().getClient()` instead of deprecated `useClient()`. */
export const useStudioClient = (options: StudioClientOptions): SanityClient => {
  const source = useSource();

  return useMemo(() => source.getClient(options), [source, options]);
};
