import type { FaqProps } from "../types";

import { INSURANCE_FAQ_ITEMS } from "./insuranceFaqItems";
import { INSURANCE_SUPPLEMENT_FAQ_ITEMS } from "./insuranceSupplementFaqItems";

export const INSURANCE_FAQS_PAGE_DEFAULT_SEO = {
  title: "Insurance Claim FAQ | Tandra Peters",
  description:
    "Answers on Texas insurance claims—loss sheets, ACV checks, recoverable depreciation, supplements, denied claims, and how Birdcreek handles payments.",
} as const;

export const INSURANCE_CLAIMS_FAQ_DEFAULTS: Partial<FaqProps> = {
  tagline: "Claims questions",
  title: "Insurance claim FAQ",
  intro:
    "Straight answers on loss sheets, checks, depreciation, and how Birdcreek handles payments—nothing hidden.",
  items: INSURANCE_FAQ_ITEMS,
};

export const INSURANCE_SUPPLEMENTS_FAQ_DEFAULTS: Partial<FaqProps> = {
  tagline: "Supplements",
  title: "Insurance supplements",
  intro:
    "When adjusters miss damage or the numbers don't add up, Birdcreek submits a supplement. Here's how that process works—and what you may need to do along the way. If something isn't covered here, reach out. I'm your point person on the claim.",
  items: INSURANCE_SUPPLEMENT_FAQ_ITEMS,
};
