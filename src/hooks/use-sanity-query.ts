import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getSanityClient,
  isSanityPresentationPreviewActive,
} from "../sanity/client";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentation-events";
import {
  cleanSanityResult,
  fetchSanityQuery,
  readSessionCache,
  writeSessionCache,
} from "../sanity/query-cache";

type QueryParams = Record<string, unknown>;

export interface UseSanityQueryOptions<TRaw, TData = TRaw> {
  /** GROQ query string. */
  query: string;
  /** Query parameters (also part of the request-dedupe / effect key). */
  params?: QueryParams;
  /** When false, skips fetching and resets data to null. Default true. */
  enabled?: boolean;
  /**
   * Maps the raw GROQ result to the hook's data shape. Defaults to stega-aware
   * cleaning (`cleanSanityResult`). Provide a custom transform when the hook
   * needs bespoke normalization (it then owns any stega handling).
   */
  transform?: (raw: TRaw) => TData;
  /** sessionStorage key to seed initial data and persist successful results. */
  cacheKey?: string;
  /**
   * Debounce window (ms) for `refetch()` and Presentation-driven refetches. The
   * initial/param-change load stays immediate.
   */
  debounceMs?: number;
  /** Presentation-only live query subscription that triggers a refetch. */
  listenQuery?: string;
  /** Listen for the in-app Presentation refresh event. Default true. */
  presentationRefresh?: boolean;
  /** Clear data when a fetch fails (matches single-record detail hooks). Default false. */
  resetDataOnError?: boolean;
  /** Set loading true at the start of every fetch (matches param-driven detail hooks). Default false. */
  showLoadingOnRefetch?: boolean;
}

export interface UseSanityQueryResult<TData> {
  data: TData | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

const noop = () => {
  // Swallow rejections from fire-and-forget refetches.
};

/**
 * Shared Sanity GROQ fetching hook. Centralizes loading/error state, cancellation
 * of stale results, request de-duplication, optional sessionStorage caching,
 * debounced refetching, and Presentation (Visual Editing) refresh + live listen.
 *
 * The per-content hooks (`use-sanity-*`) are thin wrappers over this that only
 * declare their query and map the generic `data` into their historical return
 * shape, so their public API and behavior are unchanged.
 */
export const useSanityQuery = <TRaw, TData = TRaw>(
  options: UseSanityQueryOptions<TRaw, TData>
): UseSanityQueryResult<TData> => {
  const {
    query,
    params,
    enabled = true,
    cacheKey,
    debounceMs,
    listenQuery,
    presentationRefresh = true,
  } = options;

  const paramsKey = params ? JSON.stringify(params) : "";

  const [data, setData] = useState<TData | null>(() =>
    cacheKey ? readSessionCache<TData>(cacheKey) : null
  );
  const [loading, setLoading] = useState<boolean>(() => {
    if (!enabled) {
      return false;
    }
    return cacheKey ? readSessionCache<TData>(cacheKey) === null : true;
  });
  const [error, setError] = useState<Error | null>(null);

  // Keep the latest option callbacks/values without retriggering effects.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const runFetch = useCallback(async (dedupe: boolean): Promise<void> => {
    const {
      query: q,
      params: p,
      transform,
      cacheKey: key,
      resetDataOnError,
      showLoadingOnRefetch,
    } = optionsRef.current;
    const requestId = ++requestIdRef.current;
    const isStale = () =>
      !mountedRef.current || requestId !== requestIdRef.current;

    if (showLoadingOnRefetch) {
      setLoading(true);
    }

    try {
      const raw = await fetchSanityQuery<TRaw>(q, p, { dedupe });
      if (isStale()) {
        return;
      }
      const next = transform
        ? transform(raw)
        : (cleanSanityResult(raw) as unknown as TData);
      setData(next);
      setError(null);
      if (key && next !== null) {
        writeSessionCache(key, next);
      }
    } catch (fetchError) {
      if (isStale()) {
        return;
      }
      setError(toError(fetchError));
      if (resetDataOnError) {
        setData(null);
      }
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced scheduler shared by refetch()/Presentation triggers.
  const debouncedRefetch = useMemo(() => {
    if (!debounceMs) {
      return null;
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        runFetch(false).catch(noop);
      }, debounceMs);
    };
    schedule.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };
    return schedule;
  }, [debounceMs, runFetch]);

  const refetch = useCallback((): Promise<void> => {
    if (debouncedRefetch) {
      debouncedRefetch();
      return Promise.resolve();
    }
    return runFetch(false);
  }, [debouncedRefetch, runFetch]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      debouncedRefetch?.cancel();
    },
    [debouncedRefetch]
  );

  // Primary load: immediate on mount and whenever query/params/enabled change.
  useEffect(() => {
    if (!enabled) {
      requestIdRef.current++;
      setData(null);
      setLoading(false);
      return;
    }
    runFetch(true).catch(noop);
  }, [enabled, query, paramsKey, runFetch]);

  useEffect(() => {
    if (!presentationRefresh) {
      return;
    }
    const handleRefresh = () => {
      refetch().catch(noop);
    };
    window.addEventListener(SANITY_PRESENTATION_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(
        SANITY_PRESENTATION_REFRESH_EVENT,
        handleRefresh
      );
    };
  }, [presentationRefresh, refetch]);

  // Presentation iframe only — a debounced refetch avoids hammering the query on
  // every keystroke while editing in Studio.
  useEffect(() => {
    if (!listenQuery || !isSanityPresentationPreviewActive()) {
      return;
    }
    const client = getSanityClient();
    const subscription = client
      .listen(listenQuery, {}, { includeResult: false })
      .subscribe(() => {
        refetch().catch(noop);
      });
    return () => {
      subscription.unsubscribe();
    };
  }, [listenQuery, refetch]);

  return { data, error, loading, refetch };
};
