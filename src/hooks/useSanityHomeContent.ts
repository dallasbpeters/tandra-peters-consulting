import { stegaClean } from "@sanity/client/stega";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PostListItem } from "../types/article";

import {
  getSanityClient,
  isSanityPresentationPreviewActive,
  isSanityStegaUiActive,
} from "../sanity/client";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentationEvents";
import { HOME_AND_SITE_QUERY } from "../sanity/queries";

const isPostListItem = (v: unknown): v is PostListItem => {
  if (!v || typeof v !== "object") {
    return false;
  }
  const p = v as Record<string, unknown>;
  return (
    typeof p._id === "string" &&
    typeof p.title === "string" &&
    typeof p.slug === "string" &&
    p.slug.trim().length > 0
  );
};

const filterResolvedPosts = (v: unknown): PostListItem[] => {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter(isPostListItem);
};

const homeArticleTeaser = (
  home: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined => {
  const sections = home?.sections;
  if (!Array.isArray(sections)) {
    return undefined;
  }
  const section = sections.find(
    (item): item is { _type?: string; data?: Record<string, unknown> } =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as { _type?: unknown })._type === "articlesTeaserSection",
  );
  return section?.data;
};

const teaserMaxPosts = (home: Record<string, unknown> | null | undefined): number => {
  const teaser = homeArticleTeaser(home);
  const raw = teaser?.maxPosts;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(50, Math.max(1, Math.floor(raw)));
  }
  return 8;
};

/** Curated list when set; otherwise newest posts. Always capped by `articlesTeaser.maxPosts`. */
const resolveHomeArticleCards = (
  latestFromQuery: PostListItem[] | null | undefined,
  home: Record<string, unknown> | null | undefined,
): PostListItem[] => {
  const n = teaserMaxPosts(home);
  const teaser = homeArticleTeaser(home);
  const fromArticles = filterResolvedPosts(teaser?.articlesResolved);
  const fromLegacy = filterResolvedPosts(teaser?.legacyFeaturedResolved);
  const manual = fromArticles.length > 0 ? fromArticles : fromLegacy.length > 0 ? fromLegacy : [];

  if (manual.length > 0) {
    return manual.slice(0, n);
  }

  const list = latestFromQuery ?? [];
  return list.slice(0, n);
};

export type HomeDocuments = {
  home: Record<string, unknown> | null;
  site: Record<string, unknown> | null;
  latestPosts: PostListItem[];
};

const PRESENTATION_REFETCH_MS = 450;

const CACHE_KEY = "sanity-home-v1";

const readCache = (): HomeDocuments | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as HomeDocuments) : null;
  } catch {
    return null;
  }
};

const writeCache = (data: HomeDocuments): void => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (_) {
    // sessionStorage may be unavailable (private browsing, quota exceeded)
  }
};

const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) & { cancel: () => void } => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
};

const normalizeHomeDocuments = (raw: HomeDocuments): HomeDocuments => {
  if (isSanityStegaUiActive()) {
    return {
      ...raw,
      latestPosts: resolveHomeArticleCards(raw.latestPosts, raw.home),
    };
  }

  const cleaned = stegaClean(raw) as HomeDocuments;
  return {
    ...cleaned,
    latestPosts: resolveHomeArticleCards(cleaned.latestPosts, cleaned.home),
  };
};

export const useSanityHomeContent = () => {
  const cachedOnMount = useState(() => readCache())[0];
  const [data, setData] = useState<HomeDocuments | null>(cachedOnMount);
  const [loading, setLoading] = useState(cachedOnMount === null);
  const [error, setError] = useState<Error | null>(null);

  const refetchNow = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw = await client.fetch<HomeDocuments>(HOME_AND_SITE_QUERY);
      const normalized = normalizeHomeDocuments(raw);
      setData(normalized);
      writeCache(normalized);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchNowRef = useRef(refetchNow);
  refetchNowRef.current = refetchNow;

  const scheduleRefetch = useMemo(
    () =>
      debounce(() => {
        void refetchNowRef.current();
      }, PRESENTATION_REFETCH_MS),
    [],
  );

  const refetch = useCallback(async () => {
    scheduleRefetch();
  }, [scheduleRefetch]);

  useEffect(
    () => () => {
      scheduleRefetch.cancel();
    },
    [scheduleRefetch],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const client = getSanityClient();
        const raw = await client.fetch<HomeDocuments>(HOME_AND_SITE_QUERY);
        if (!cancelled) {
          const normalized = normalizeHomeDocuments(raw);
          setData(normalized);
          writeCache(normalized);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      scheduleRefetch();
    };
    window.addEventListener(SANITY_PRESENTATION_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(SANITY_PRESENTATION_REFRESH_EVENT, handleRefresh);
    };
  }, [scheduleRefetch]);

  // Presentation iframe only — debounced refetch avoids hammering the full home
  // GROQ query (and 20-post join) on every keystroke while editing in Studio.
  useEffect(() => {
    if (!isSanityPresentationPreviewActive()) {
      return;
    }

    const client = getSanityClient();
    const subscription = client
      .listen('*[_id in ["homePage", "drafts.homePage"]]', {}, { includeResult: false })
      .subscribe(() => {
        scheduleRefetch();
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [scheduleRefetch]);

  return { data, loading, error, refetch };
};
