import type { PortableTextBlock } from "@portabletext/types";

import { INSURANCE_FAQ_ITEMS } from "../../src/lib/insuranceFaqItems";
import { INSURANCE_SUPPLEMENT_FAQ_ITEMS } from "../../src/lib/insuranceSupplementFaqItems";
import type { FaqItem } from "../../src/types";
import { blocksFromParagraphs } from "./blocksFromText";

const faqItemsToSanity = (items: FaqItem[]) =>
  items.map((item) => ({
    _key:
      item._key ??
      item.question.slice(0, 24).replaceAll(/\W+/g, "-").toLowerCase(),
    _type: "faqItem" as const,
    answer: item.answer as PortableTextBlock[],
    question: item.question,
  }));

export const insuranceFaqsPageSeed = {
  _id: "insuranceFaqsPage",
  _type: "insuranceFaqsPage" as const,
  claimsFaq: {
    _type: "faqSection" as const,
    intro: blocksFromParagraphs(
      [
        "Straight answers on loss sheets, checks, depreciation, and how Birdcreek handles payments—nothing hidden.",
      ],
      "insurance-claims-intro"
    ),
    items: faqItemsToSanity(INSURANCE_FAQ_ITEMS),
    tagline: "Claims questions",
    title: "Insurance claim FAQ",
  },
  seoDescription:
    "Answers on Texas insurance claims—loss sheets, ACV checks, recoverable depreciation, supplements, denied claims, and how Birdcreek handles payments.",
  seoTitle: "Insurance Claim FAQ | Tandra Peters",
  supplementsFaq: {
    _type: "faqSection" as const,
    intro: blocksFromParagraphs(
      [
        "When adjusters miss damage or the numbers don't add up, Birdcreek submits a supplement. Here's how that process works—and what you may need to do along the way.",
        "If something isn't covered here, reach out. I'm your point person on the claim.",
      ],
      "insurance-supplements-intro"
    ),
    items: faqItemsToSanity(INSURANCE_SUPPLEMENT_FAQ_ITEMS),
    tagline: "Supplements",
    title: "Insurance supplements",
  },
};
