import { stegaClean } from "@sanity/client/stega";
import { useCallback, useEffect, useState } from "react";

import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentation-events";
import { ROOF_INSPECTIONS_PAGE_QUERY } from "../sanity/queries";

interface RoofInspectionsPageDoc {
  roofInspection?: Record<string, unknown>;
  seoDescription?: string;
  seoTitle?: string;
  socialShare?: Record<string, unknown>;
}

interface RoofInspectionsQueryResult {
  homeRoofInspection?: Record<string, unknown>;
  homeSocialShare?: Record<string, unknown>;
  page?: RoofInspectionsPageDoc | null;
}

export const useSanityRoofInspectionsPage = () => {
  const [page, setPage] = useState<RoofInspectionsPageDoc | null>(null);
  const [homeRoofInspection, setHomeRoofInspection] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [homeSocialShare, setHomeSocialShare] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw = await client.fetch<RoofInspectionsQueryResult | null>(
        ROOF_INSPECTIONS_PAGE_QUERY
      );
      const cleaned =
        raw && !isSanityStegaUiActive()
          ? (stegaClean(raw) as RoofInspectionsQueryResult | null)
          : raw;
      setPage(cleaned?.page ?? null);
      setHomeRoofInspection(cleaned?.homeRoofInspection ?? null);
      setHomeSocialShare(cleaned?.homeSocialShare ?? null);
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

  return { error, homeRoofInspection, homeSocialShare, loading, page, refetch };
};
