import { ROOF_INSPECTIONS_PAGE_QUERY } from "../sanity/queries";
import { useSanityQuery } from "./use-sanity-query";

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
  const { data, error, loading, refetch } =
    useSanityQuery<RoofInspectionsQueryResult | null>({
      query: ROOF_INSPECTIONS_PAGE_QUERY,
    });

  return {
    error,
    homeRoofInspection: data?.homeRoofInspection ?? null,
    homeSocialShare: data?.homeSocialShare ?? null,
    loading,
    page: data?.page ?? null,
    refetch,
  };
};
