import { useCallback, useEffect, useState } from "react";
import { stegaClean } from "@sanity/client/stega";
import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import { HOME_AND_SITE_QUERY } from "../sanity/queries";
import type { PostListItem } from "../types/article";

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

const teaserMaxPosts = (
  home: Record<string, unknown> | null | undefined,
): number => {
  const teaser = home?.articlesTeaser as Record<string, unknown> | undefined;
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
  const teaser = home?.articlesTeaser as Record<string, unknown> | undefined;
  const fromArticles = filterResolvedPosts(teaser?.articlesResolved);
  const fromLegacy = filterResolvedPosts(teaser?.legacyFeaturedResolved);
  const manual =
    fromArticles.length > 0
      ? fromArticles
      : fromLegacy.length > 0
        ? fromLegacy
        : [];

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
  const [data, setData] = useState<HomeDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw = await client.fetch<HomeDocuments>(HOME_AND_SITE_QUERY);
      setData(normalizeHomeDocuments(raw));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const client = getSanityClient();
        const raw = await client.fetch<HomeDocuments>(HOME_AND_SITE_QUERY);
        if (!cancelled) {
          setData(normalizeHomeDocuments(raw));
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

  return { data, loading, error, refetch };
};
