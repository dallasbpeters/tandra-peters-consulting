import groq from "groq";

/** Resolve Sanity image fields to CDN URLs for the Vite app (no @sanity/image-url needed). */
export const HOME_AND_SITE_QUERY = groq`{
  "home": *[_id == "homePage"][0]{
    ...,
    seoTitle,
    seoDescription,
    "tandraIntroVideo": tandraIntroVideo{
      ...,
      "thumbnailUrl": thumbnail.asset->url
    },
    sections[]{
      _key,
      _type,
      "data": select(
        _type == "heroSection" => {
          badge,
          titleLine1,
          titleLine2,
          subtitle,
          ctaText,
          ctaHref,
          secondaryCtaText,
          secondaryCtaHref,
          "backgroundImage": backgroundImage.asset->url,
          "skyImage": skyImage.asset->url,
          "foregroundImage": foregroundImage.asset->url,
          heroStyle
        },
        _type == "marqueeSection" => {
          text,
          direction,
          velocity
        },
        _type == "birdcreekVideoBannerSection" => {
          vimeoUrl,
          title
        },
        _type == "videoSection" => {
          "video": coalesce(video.asset->url, video),
          title,
          "posterUrl": posterUrl.asset->url
        },
        _type == "aboutSection" => {
          badgeText,
          badgeSubtext,
          "image": image.asset->url,
          titleLine1,
          titleLine2,
          body,
          paragraphs
        },
        _type == "statsSection" => {
          title,
          items[] { ... }
        },
        _type == "servicesSection" => {
          tagline,
          titleLines,
          description,
          services[] {
            ...,
            "image": image.asset->url
          },
          birdcreekAdvantage {
            ...
          },
          servicesStyle,
          typographicArt {
            "baseMaskImage": baseMaskImage.asset->url,
            "overlayMaskImage": overlayMaskImage.asset->url
          }
        },
        _type == "serviceAreaMap" => {
          eyebrow,
          title,
          description,
          areas[] {
            countyKey,
            displayName,
            clientCount
          }
        },
        _type == "missionSection" => {
          tagline,
          title,
          description,
          values[] {
            ...,
            "image": image.asset->url
          }
        },
        _type == "beforeAfterSection" => {
          eyebrow,
          title,
          intro,
          items[] {
            _key,
            title,
            description,
            "beforeImage": beforeImage.asset->url,
            "afterImage": afterImage.asset->url
          }
        },
        _type == "expertiseSection" => {
          tagline,
          title,
          items[] {
            ...,
            "image": image.asset->url
          }
        },
        _type == "contactBannerSection" => {
          eyebrow,
          headline,
          phoneLabel,
          phoneDisplay,
          phoneTel,
          phoneHref,
          phoneAriaLabel,
          ariaLabel,
          ctaIcon,
          backgroundColor,
          textColor,
          eyebrowColor,
          eyebrowColorLight,
          accentGlowColor,
          iconColor,
          iconColorLight,
          iconColorDark,
          iconColorVeryDark,
          phoneLinkBackground,
          phoneLinkHoverBackground,
          phoneLinkHoverShadow,
          phoneLinkHoverOutline,
          phoneLinkHoverTextColor,
          phoneLinkHoverLabelColor,
          phoneIconBackground,
          phoneIconHoverBackground,
          pulseColor,
          pulsePingColor,
          gridColor
        },
        _type == "testimonialsSection" => {
          tagline,
          title,
          elfsightWidgetId,
          emptyStateNote
        },
        _type == "faqSection" => {
          tagline,
          title,
          intro,
          items[] {
            _key,
            question,
            answer
          }
        },
        _type == "articlesTeaserSection" => {
          eyebrow,
          title,
          intro,
          viewAllLabel,
          maxPosts,
          enabled,
          featuredPosts
        },
        _type == "certificationsSection" => {
          title
        },
        _type == "contactSection" => {
          tagline,
          title,
          email,
          phone,
          location
        },
        _type == "socialShareSection" => {
          heading,
          shareText
        }
      )
    },
  },
  "site": *[_id == "siteSettings"][0]{
    ...,
    "navLogoImage": navLogoImage.asset->url
  },
  "latestPosts": *[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...20] {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    category,
    "image": image.asset->url
  }
}`;

const roofInspectionSectionProjection = groq`{
  kicker,
  titleLine1,
  titleLine2,
  subtitle,
  lede,
  "diagramImage": diagramImage { asset->{ url } },
  hotspots[] {
    _key,
    label,
    direction,
    calloutTitle,
    calloutBody,
    watchFor,
    pos3dX,
    pos3dY,
    pos3dZ,
    norm3dX,
    norm3dY,
    norm3dZ
  }
}`;

/** /roof-inspections: dedicated diagram singleton; falls back to homePage.roofInspection in the app. */
export const ROOF_INSPECTIONS_PAGE_QUERY = groq`{
  "page": *[_id == "roofInspectionsPage"][0]{
    seoTitle,
    seoDescription,
    roofInspection ${roofInspectionSectionProjection}
  },
  "homeRoofInspection": *[_id == "homePage"][0].roofInspection ${roofInspectionSectionProjection},
  "homeSocialShare": *[_id == "homePage"][0].socialShare {
    heading,
    shareText
  }
}`;

/** /workflow: insurance claim diagram singleton. */
export const WORKFLOW_PAGE_QUERY = groq`*[_id == "workflowPage"][0]{
  pageTitle,
  pageLede,
  seoTitle,
  seoDescription,
  viewportZoom,
  viewportAnchorX,
  viewportAnchorY,
  layoutOriginX,
  layoutOriginY,
  layoutNodeWidth,
  layoutNodeHeight,
  layoutColGap,
  layoutRowGap,
  layoutFinalRowExtraOffset,
  nodes[]{
    _key,
    stepId,
    title,
    body,
    wide,
    posX,
    posY,
    subsections[]{
      title,
      body
    }
  },
  edges[]{
    _key,
    edgeId,
    sourceStep,
    targetStep,
    sourceHandle,
    targetHandle,
    label
  }
}`;

/** /insurance-faqs: claims + supplements FAQ singleton. */
export const INSURANCE_FAQS_PAGE_QUERY = groq`*[_id == "insuranceFaqsPage"][0]{
  seoTitle,
  seoDescription,
  claimsFaq {
    tagline,
    title,
    intro,
    items[]{
      _key,
      question,
      answer
    }
  },
  supplementsFaq {
    tagline,
    title,
    intro,
    items[]{
      _key,
      question,
      answer
    }
  }
}`;

/** /articles: singleton page copy + all posts (newest first). */
export const ARTICLES_INDEX_QUERY = groq`{
  "page": *[_id == "articlesPage"][0]{
    pageTitle,
    intro,
    seoTitle,
    seoDescription
  },
  "posts": *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    category,
    seoDescription,
    authorName,
    "image": image.asset->url
  }
}`;

/** /estimate: standalone cost-estimator singleton (+ homepage banner copy). */
export const ESTIMATOR_PAGE_QUERY = groq`*[_id == "estimatorPage"][0]{
  seoTitle,
  seoDescription,
  eyebrow,
  title,
  description,
  startButtonLabel,
  resultHeading,
  disclaimer,
  baseFee,
  baseRatePerSqft,
  rangeSpreadPercent,
  currency,
  bannerEyebrow,
  bannerHeadline,
  bannerCtaLabel,
  questions[] {
    _key,
    prompt,
    helpText,
    drivesSquareFootage,
    options[] {
      _key,
      label,
      description,
      sqftMidpoint,
      pricePerSqftAdd,
      flatAdd
    }
  }
}`;

export const BEFORE_AFTER_GALLERY_QUERY = groq`*[_type == "beforeAfterGallery"] | order(coalesce(orderRank, _createdAt) asc) {
  _id,
  title,
  description,
  "beforeImage": beforeImage.asset->url,
  "afterImage": afterImage.asset->url
}`;

export const SANITY_IMAGE_LIBRARY_QUERY = groq`*[_type == "sanity.imageAsset" && defined(url)] | order(_createdAt desc)[0...80] {
  _id,
  _createdAt,
  originalFilename,
  title,
  altText,
  url,
  metadata {
    lqip,
    dimensions {
      width,
      height
    }
  }
}`;

/** Saved ad creative versions for the Ad Builder version picker. */
export const AD_CREATIVE_VERSIONS_QUERY = groq`*[_type == "adCreativeVersion"] | order(savedAt desc)[0...100] {
  _id,
  name,
  savedAt,
  config
}`;

/** Single post by slug for /articles/:slug */
export const POST_BY_SLUG_QUERY = groq`*[_type == "post" && slug.current == $slug][0] {
  ...,
  "slug": slug.current,
  excerpt,
  category,
  seoDescription,
  authorName,
  "image": image.asset->url
}`;

export * from "./generated";
