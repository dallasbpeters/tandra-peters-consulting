import type { FaqProps } from "../types";
import { INSURANCE_FAQ_ITEMS } from "./insurance-faq-items";
import { INSURANCE_SUPPLEMENT_FAQ_ITEMS } from "./insurance-supplement-faq-items";

export const INSURANCE_FAQS_PAGE_DEFAULT_SEO = {
  description:
    "Answers on Texas insurance claims—loss sheets, ACV checks, recoverable depreciation, supplements, denied claims, and how Birdcreek handles payments.",
  title: "Insurance Claim FAQ | Tandra Peters",
} as const;

export const INSURANCE_CLAIMS_FAQ_DEFAULTS: Partial<FaqProps> = {
  intro:
    "Straight answers on loss sheets, checks, depreciation, and how Birdcreek handles payments—nothing hidden.",
  items: INSURANCE_FAQ_ITEMS,
  tagline: "Claims questions",
  title: "Insurance claim FAQ",
};

export const INSURANCE_SUPPLEMENTS_FAQ_DEFAULTS: Partial<FaqProps> = {
  intro:
    "When adjusters miss damage or the numbers don't add up, Birdcreek submits a supplement. Here's how that process works—and what you may need to do along the way. If something isn't covered here, reach out. I'm your point person on the claim.",
  items: INSURANCE_SUPPLEMENT_FAQ_ITEMS,
  tagline: "Supplements",
  title: "Insurance supplements",
};
