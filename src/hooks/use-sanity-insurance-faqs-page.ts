import type { InsuranceFaqsPageDoc } from "../sanity/map-sanity-insurance-faqs";
import { INSURANCE_FAQS_PAGE_QUERY } from "../sanity/queries";
import { useSanityQuery } from "./use-sanity-query";

export const useSanityInsuranceFaqsPage = () => {
  const { data, error, loading, refetch } =
    useSanityQuery<InsuranceFaqsPageDoc | null>({
      query: INSURANCE_FAQS_PAGE_QUERY,
    });
  return { error, loading, page: data ?? null, refetch };
};
