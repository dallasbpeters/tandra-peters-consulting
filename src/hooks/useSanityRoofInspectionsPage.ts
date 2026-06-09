import { stegaClean } from "@sanity/client/stega";
import { useCallback, useEffect, useState } from "react";

import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentationEvents";
import { ROOF_INSPECTIONS_PAGE_QUERY } from "../sanity/queries";

type RoofInspectionsPageDoc = {
  seoTitle?: string;
  seoDescription?: string;
  roofInspection?: Record<string, unknown>;
  socialShare?: Record<string, unknown>;
};

type RoofInspectionsQueryResult = {
  page?: RoofInspectionsPageDoc | null;
  homeRoofInspection?: Record<string, unknown>;
  homeSocialShare?: Record<string, unknown>;
};

export const useSanityRoofInspectionsPage = () => {
  const [page, setPage] = useState<RoofInspectionsPageDoc | null>(null);
  const [homeRoofInspection, setHomeRoofInspection] = useState<Record<string, unknown> | null>(
    null,
  );
  const [homeSocialShare, setHomeSocialShare] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw = await client.fetch<RoofInspectionsQueryResult | null>(
        ROOF_INSPECTIONS_PAGE_QUERY,
      );
      const cleaned =
        raw && !isSanityStegaUiActive()
          ? (stegaClean(raw) as RoofInspectionsQueryResult | null)
          : raw;
      setPage(cleaned?.page ?? null);
      setHomeRoofInspection(cleaned?.homeRoofInspection ?? null);
      setHomeSocialShare(cleaned?.homeSocialShare ?? null);
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

  return { page, homeRoofInspection, homeSocialShare, loading, error, refetch };
};
