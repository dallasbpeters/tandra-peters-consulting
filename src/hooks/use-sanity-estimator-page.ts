import type { EstimatorPageDoc } from "../sanity/map-estimator-page";
import { ESTIMATOR_PAGE_QUERY } from "../sanity/queries";
import { useSanityQuery } from "./use-sanity-query";

export const useSanityEstimatorPage = () => {
  const { data, error, loading, refetch } = useSanityQuery<EstimatorPageDoc>({
    query: ESTIMATOR_PAGE_QUERY,
  });
  return { error, loading, page: data ?? null, refetch };
};
