import { useEffect, useState } from "react";
import type { SanityImageAsset } from "./useSanityImageAssets";

const DEFAULT_UNSPLASH_QUERY = "Austin roofing";
const SEARCH_DEBOUNCE_MS = 350;

export type UnsplashImageAsset = SanityImageAsset & {
  attribution?: string;
  authorName?: string;
  authorUrl?: string;
  downloadLocation?: string;
};

type UnsplashSearchPayload = {
  images?: UnsplashImageAsset[];
  error?: string;
};

export const useUnsplashImageSearch = (enabled: boolean) => {
  const [query, setQuery] = useState(DEFAULT_UNSPLASH_QUERY);
  const [images, setImages] = useState<UnsplashImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setImages([]);
      setLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void fetch(
        `/api/unsplash-search?query=${encodeURIComponent(trimmedQuery)}`,
        { signal: abortController.signal },
      )
        .then(async (response) => {
          const payload = (await response.json()) as UnsplashSearchPayload;
          if (!response.ok) {
            throw new Error(payload.error ?? "Could not search Unsplash.");
          }
          return payload.images ?? [];
        })
        .then(setImages)
        .catch((searchError) => {
          if (abortController.signal.aborted) {
            return;
          }

          setError(
            searchError instanceof Error
              ? searchError.message
              : "Could not search Unsplash.",
          );
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [enabled, query, reloadKey]);

  return {
    error,
    images,
    loading,
    query,
    refresh: () => setReloadKey((current) => current + 1),
    setQuery,
  };
};
