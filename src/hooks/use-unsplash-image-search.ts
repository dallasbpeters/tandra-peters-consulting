import { useEffect, useState } from "react";

import type { SanityImageAsset } from "./use-sanity-image-assets";

const DEFAULT_UNSPLASH_QUERY = "Austin roofing";
const SEARCH_DEBOUNCE_MS = 350;

export type UnsplashImageAsset = SanityImageAsset & {
  attribution?: string;
  authorName?: string;
  authorUrl?: string;
  downloadLocation?: string;
};

interface UnsplashSearchPayload {
  error?: string;
  images?: UnsplashImageAsset[];
}

export const useUnsplashImageSearch = (enabled: boolean) => {
  const [query, setQuery] = useState(DEFAULT_UNSPLASH_QUERY);
  const [images, setImages] = useState<UnsplashImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_reloadKey, setReloadKey] = useState(0);

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

      fetch(`/api/unsplash-search?query=${encodeURIComponent(trimmedQuery)}`, {
        signal: abortController.signal,
      })
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
              : "Could not search Unsplash."
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
  }, [enabled, query]);

  return {
    error,
    images,
    loading,
    query,
    refresh: () => setReloadKey((current) => current + 1),
    setQuery,
  };
};
