import { stegaClean } from "@sanity/client/stega";

import { isSanityStegaUiActive } from "../sanity/client";
import { HOME_AND_SITE_QUERY } from "../sanity/queries";
import type { PostListItem } from "../types/article";
import { useSanityQuery } from "./use-sanity-query";

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
  home: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined => {
  const sections = home?.sections;
  if (!Array.isArray(sections)) {
    return;
  }
  const section = sections.find(
    (item): item is { _type?: string; data?: Record<string, unknown> } =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as { _type?: unknown })._type === "articlesTeaserSection"
  );
  return section?.data;
};

const teaserMaxPosts = (
  home: Record<string, unknown> | null | undefined
): number => {
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
  home: Record<string, unknown> | null | undefined
): PostListItem[] => {
  const n = teaserMaxPosts(home);
  const teaser = homeArticleTeaser(home);
  const fromArticles = filterResolvedPosts(teaser?.articlesResolved);
  const fromLegacy = filterResolvedPosts(teaser?.legacyFeaturedResolved);
  const manualFromLegacy = fromLegacy.length > 0 ? fromLegacy : [];
  const manual = fromArticles.length > 0 ? fromArticles : manualFromLegacy;

  if (manual.length > 0) {
    return manual.slice(0, n);
  }

  const list = latestFromQuery ?? [];
  return list.slice(0, n);
};

export interface HomeDocuments {
  home: Record<string, unknown> | null;
  latestPosts: PostListItem[];
  reportBranding: Record<string, unknown> | null;
  site: Record<string, unknown> | null;
}

const PRESENTATION_REFETCH_MS = 450;

const CACHE_KEY = "sanity-home-v1";

// Presentation iframe only — refetch the full home GROQ (and its post join) when
// the homePage document changes in Studio.
const HOME_LISTEN_QUERY = '*[_id in ["homePage", "drafts.homePage"]]';

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

export const useSanityHomeContent = () =>
  useSanityQuery<HomeDocuments, HomeDocuments>({
    cacheKey: CACHE_KEY,
    debounceMs: PRESENTATION_REFETCH_MS,
    listenQuery: HOME_LISTEN_QUERY,
    query: HOME_AND_SITE_QUERY,
    transform: normalizeHomeDocuments,
  });
