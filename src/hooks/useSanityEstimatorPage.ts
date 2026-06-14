import { stegaClean } from "@sanity/client/stega";
import { useCallback, useEffect, useState } from "react";

import type { EstimatorPageDoc } from "../sanity/mapEstimatorPage";

import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentationEvents";
import { ESTIMATOR_PAGE_QUERY } from "../sanity/queries";

export const useSanityEstimatorPage = () => {
  const [page, setPage] = useState<EstimatorPageDoc>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw = await client.fetch<EstimatorPageDoc>(ESTIMATOR_PAGE_QUERY);
      const result = raw && !isSanityStegaUiActive() ? (stegaClean(raw) as EstimatorPageDoc) : raw;
      setPage(result ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const onPresentationRefresh = () => {
      void refetch();
    };
    window.addEventListener(SANITY_PRESENTATION_REFRESH_EVENT, onPresentationRefresh);
    return () =>
      window.removeEventListener(SANITY_PRESENTATION_REFRESH_EVENT, onPresentationRefresh);
  }, [refetch]);

  return { page, loading, error, refetch };
};
