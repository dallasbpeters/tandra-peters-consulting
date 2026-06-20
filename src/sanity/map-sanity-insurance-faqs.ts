import type { FaqProps } from "../types";
import { mapFaqProps } from "./map-sanity-home";

export interface InsuranceFaqsPageDoc {
  claimsFaq?: Record<string, unknown> | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
  supplementsFaq?: Record<string, unknown> | null;
}

export const mapInsuranceClaimsFaqProps = (
  page: InsuranceFaqsPageDoc | null | undefined
): Partial<FaqProps> => mapFaqProps(page?.claimsFaq ?? null);

export const mapInsuranceSupplementsFaqProps = (
  page: InsuranceFaqsPageDoc | null | undefined
): Partial<FaqProps> => mapFaqProps(page?.supplementsFaq ?? null);
