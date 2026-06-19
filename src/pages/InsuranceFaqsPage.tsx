import { useEffect, useMemo } from "react";
import { ContactBanner } from "../components/ContactBanner";
import { Faq } from "../components/Faq";
import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityInsuranceFaqsPage } from "../hooks/useSanityInsuranceFaqsPage";
import { CONTACT_BANNER_FREE_INSPECTION } from "../lib/contactBannerPresets";
import {
  INSURANCE_CLAIMS_FAQ_DEFAULTS,
  INSURANCE_FAQS_PAGE_DEFAULT_SEO,
  INSURANCE_SUPPLEMENTS_FAQ_DEFAULTS,
} from "../lib/insuranceFaqsPageDefaults";
import { plainTextFromRich } from "../portableText/plainText";
import {
  mapInsuranceClaimsFaqProps,
  mapInsuranceSupplementsFaqProps,
} from "../sanity/mapSanityInsuranceFaqs";
import type { FaqItem } from "../types";

const INSURANCE_FAQS_JSON_LD_ID = "insurance-faqs-json-ld";

const resolveFaqSection = (
  cmsProps: ReturnType<typeof mapInsuranceClaimsFaqProps>,
  defaults: typeof INSURANCE_CLAIMS_FAQ_DEFAULTS
) => ({
  tagline: cmsProps.tagline ?? defaults.tagline,
  title: cmsProps.title ?? defaults.title,
  intro: cmsProps.intro ?? defaults.intro,
  items:
    cmsProps.items && cmsProps.items.length > 0
      ? cmsProps.items
      : (defaults.items ?? []),
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
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: plainTextFromRich(item.answer),
        },
      })),
    }),
    [allFaqItems]
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.id = INSURANCE_FAQS_JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);
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
    title: seoTitle,
    description: seoDescription,
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
