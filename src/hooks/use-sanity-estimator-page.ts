import { stegaClean } from "@sanity/client/stega";
import { useCallback, useEffect, useState } from "react";

import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import type { EstimatorPageDoc } from "../sanity/map-estimator-page";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentation-events";
import { ESTIMATOR_PAGE_QUERY } from "../sanity/queries";

export const useSanityEstimatorPage = () => {
  const [page, setPage] = useState<EstimatorPageDoc>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw = await client.fetch<EstimatorPageDoc>(ESTIMATOR_PAGE_QUERY);
      const result =
        raw && !isSanityStegaUiActive()
          ? (stegaClean(raw) as EstimatorPageDoc)
          : raw;
      setPage(result ?? null);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch().catch(() => {
      /* noop */
    });
  }, [refetch]);

  useEffect(() => {
    const onPresentationRefresh = () => {
      refetch().catch(() => {
        /* noop */
      });
    };
    window.addEventListener(
      SANITY_PRESENTATION_REFRESH_EVENT,
      onPresentationRefresh
    );
    return () =>
      window.removeEventListener(
        SANITY_PRESENTATION_REFRESH_EVENT,
        onPresentationRefresh
      );
  }, [refetch]);

  return { error, loading, page, refetch };
};
