import { stegaClean } from "@sanity/client/stega";

import { getSanityClient, isSanityStegaUiActive } from "./client";

type QueryParams = Record<string, unknown>;

/**
 * Stega-aware cleaning: keep encoded values only when the Presentation UI needs
 * them (click-to-edit), otherwise strip them for plain reads. Mirrors the
 * `raw && !isSanityStegaUiActive() ? stegaClean(raw) : raw` idiom the Sanity
 * hooks previously duplicated.
 */
export const cleanSanityResult = <T>(raw: T): T =>
  raw && !isSanityStegaUiActive() ? (stegaClean(raw) as T) : raw;

const inflight = new Map<string, Promise<unknown>>();

const dedupeKey = (query: string, params?: QueryParams): string =>
  `${query}::${params ? JSON.stringify(params) : ""}`;

/**
 * Fetches a GROQ query via the shared, config-memoized Sanity client.
 *
 * When `dedupe` is set, concurrent identical requests (same query + params)
 * share a single in-flight promise. This collapses React StrictMode's
 * double-invoked mount effects and multiple consumers of the same query into
 * one network request. The entry is cleared as soon as the request settles, so
 * later fetches (manual refetch, Presentation edits) always hit the network and
 * stay fresh for Visual Editing.
 */
export const fetchSanityQuery = <T>(
  query: string,
  params?: QueryParams,
  { dedupe = false }: { dedupe?: boolean } = {}
): Promise<T> => {
  const client = getSanityClient();
  if (!dedupe) {
    return client.fetch<T>(query, params ?? {});
  }

  const key = dedupeKey(query, params);
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const request = client.fetch<T>(query, params ?? {}).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return request;
};

/** Reads a JSON-serialized value from `sessionStorage`, tolerant of failures. */
export const readSessionCache = <T>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

/** Writes a JSON-serialized value to `sessionStorage`, tolerant of failures. */
export const writeSessionCache = <T>(key: string, value: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable (private browsing, quota exceeded).
  }
};
