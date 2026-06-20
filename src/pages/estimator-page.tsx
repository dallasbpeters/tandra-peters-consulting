import { useMemo } from "react";

import { ContactBanner } from "../components/contact-banner";
import { Estimator } from "../components/estimator/estimator";
import { SitePageChrome } from "../components/site-page-chrome";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityEstimatorPage } from "../hooks/use-sanity-estimator-page";
import { CONTACT_BANNER_FREE_INSPECTION } from "../lib/contact-banner-presets";
import { ESTIMATOR_DEFAULT_SEO, ESTIMATOR_DEFAULTS } from "../lib/estimator";
import { mapEstimatorPageContent } from "../sanity/map-estimator-page";

export const EstimatorPage = () => {
  const { page } = useSanityEstimatorPage();

  const content = useMemo(() => {
    const cms = mapEstimatorPageContent(page);
    return {
      ...ESTIMATOR_DEFAULTS,
      ...cms,
      // Questions only override when the CMS actually has some.
      questions:
        cms.questions && cms.questions.length > 0
          ? cms.questions
          : ESTIMATOR_DEFAULTS.questions,
    };
  }, [page]);

  usePageMetadata({
    description: content.seoDescription ?? ESTIMATOR_DEFAULT_SEO.description,
    title: content.seoTitle ?? ESTIMATOR_DEFAULT_SEO.title,
  });

  return (
    <SitePageChrome>
      <Estimator content={content} />
      <ContactBanner {...CONTACT_BANNER_FREE_INSPECTION} />
    </SitePageChrome>
  );
};
