import { useEffect, useMemo } from "react";

import { ContactBanner } from "../components/contact-banner";
import { Faq } from "../components/faq";
import { SitePageChrome } from "../components/site-page-chrome";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityInsuranceFaqsPage } from "../hooks/use-sanity-insurance-faqs-page";
import { CONTACT_BANNER_FREE_INSPECTION } from "../lib/contact-banner-presets";
import {
  INSURANCE_CLAIMS_FAQ_DEFAULTS,
  INSURANCE_FAQS_PAGE_DEFAULT_SEO,
  INSURANCE_SUPPLEMENTS_FAQ_DEFAULTS,
} from "../lib/insurance-faqs-page-defaults";
import { plainTextFromRich } from "../portableText/plain-text";
import {
  mapInsuranceClaimsFaqProps,
  mapInsuranceSupplementsFaqProps,
} from "../sanity/map-sanity-insurance-faqs";
import type { FaqItem } from "../types";

const INSURANCE_FAQS_JSON_LD_ID = "insurance-faqs-json-ld";

const resolveFaqSection = (
  cmsProps: ReturnType<typeof mapInsuranceClaimsFaqProps>,
  defaults: typeof INSURANCE_CLAIMS_FAQ_DEFAULTS
) => ({
  intro: cmsProps.intro ?? defaults.intro,
  items:
    cmsProps.items && cmsProps.items.length > 0
      ? cmsProps.items
      : (defaults.items ?? []),
  tagline: cmsProps.tagline ?? defaults.tagline,
  title: cmsProps.title ?? defaults.title,
});

export const InsuranceFaqsPage = () => {
  const { page } = useSanityInsuranceFaqsPage();

  const claimsFaq = useMemo(
    () =>
      resolveFaqSection(
        mapInsuranceClaimsFaqProps(page),
        INSURANCE_CLAIMS_FAQ_DEFAULTS
      ),
    [page]
  );

  const supplementsFaq = useMemo(
    () =>
      resolveFaqSection(
        mapInsuranceSupplementsFaqProps(page),
        INSURANCE_SUPPLEMENTS_FAQ_DEFAULTS
      ),
    [page]
  );

  const allFaqItems = useMemo(
    () => [...claimsFaq.items, ...supplementsFaq.items] as FaqItem[],
    [claimsFaq.items, supplementsFaq.items]
  );

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqItems.map((item) => ({
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: plainTextFromRich(item.answer),
        },
        name: item.question,
      })),
    }),
    [allFaqItems]
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.id = INSURANCE_FAQS_JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.append(script);
    return () => {
      script.remove();
    };
  }, [faqJsonLd]);

  const seoTitle =
    typeof page?.seoTitle === "string" && page.seoTitle.trim()
      ? page.seoTitle.trim()
      : INSURANCE_FAQS_PAGE_DEFAULT_SEO.title;
  const seoDescription =
    typeof page?.seoDescription === "string" && page.seoDescription.trim()
      ? page.seoDescription.trim()
      : INSURANCE_FAQS_PAGE_DEFAULT_SEO.description;

  usePageMetadata({
    description: seoDescription,
    title: seoTitle,
  });

  return (
    <SitePageChrome>
      <Faq
        backgroundColor="transparent"
        includeJsonLd={false}
        intro={claimsFaq.intro}
        items={claimsFaq.items}
        sectionId="insurance-claims-faq"
        tagline={claimsFaq.tagline}
        title={claimsFaq.title}
      />
      <Faq
        backgroundColor="transparent"
        includeJsonLd={false}
        intro={supplementsFaq.intro}
        items={supplementsFaq.items}
        paddingTop="0"
        sectionId="insurance-supplements-faq"
        tagline={supplementsFaq.tagline}
        title={supplementsFaq.title}
      />
      <ContactBanner {...CONTACT_BANNER_FREE_INSPECTION} />
    </SitePageChrome>
  );
};
