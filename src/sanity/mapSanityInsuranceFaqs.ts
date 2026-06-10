import type { FaqProps } from "../types";

import { mapFaqProps } from "./mapSanityHome";

export type InsuranceFaqsPageDoc = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  claimsFaq?: Record<string, unknown> | null;
  supplementsFaq?: Record<string, unknown> | null;
};

export const mapInsuranceClaimsFaqProps = (
  page: InsuranceFaqsPageDoc | null | undefined,
): Partial<FaqProps> => mapFaqProps(page?.claimsFaq ?? null);

export const mapInsuranceSupplementsFaqProps = (
  page: InsuranceFaqsPageDoc | null | undefined,
): Partial<FaqProps> => mapFaqProps(page?.supplementsFaq ?? null);
