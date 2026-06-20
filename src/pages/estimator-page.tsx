import { useMemo } from "react";

import { ContactBanner } from "../components/ContactBanner";
import { Estimator } from "../components/estimator/estimator";
import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityEstimatorPage } from "../hooks/useSanityEstimatorPage";
import { CONTACT_BANNER_FREE_INSPECTION } from "../lib/contactBannerPresets";
import { ESTIMATOR_DEFAULT_SEO, ESTIMATOR_DEFAULTS } from "../lib/estimator";
import { mapEstimatorPageContent } from "../sanity/mapEstimatorPage";

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
