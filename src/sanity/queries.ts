import groq from "groq";

/** Resolve Sanity image fields to CDN URLs for the Vite app (no @sanity/image-url needed). */
export const HOME_AND_SITE_QUERY = groq`{
  "home": *[_id == "homePage"][0]{
    ...,
    seoTitle,
    seoDescription,
    hero {
      ...,
      "backgroundImage": backgroundImage.asset->url
    },
    "featuredVideo": select(
      featuredVideoSection._type == "videoSection" => {
        ...featuredVideoSection,
        "video": coalesce(featuredVideoSection.video.asset->url, featuredVideoSection.video),
        "posterUrl": coalesce(featuredVideoSection.posterUrl.asset->url, featuredVideoSection.posterUrl)
      },
      featuredVideo._type == "videoSection" => {
        ...featuredVideo,
        "video": coalesce(featuredVideo.video.asset->url, featuredVideo.video),
        "posterUrl": coalesce(featuredVideo.posterUrl.asset->url, featuredVideo.posterUrl)
      },
      defined(featuredVideoSection) => {
        "video": featuredVideoSection
      },
      defined(featuredVideo) => {
        "video": featuredVideo
      }
    ),
    about {
      ...,
      "image": image.asset->url
    },
    stats {
      ...,
      items[] { ... }
    },
    services {
      ...,
      services[] {
        ...,
        "image": image.asset->url
      }
    },
    mission {
      ...,
      values[] {
        ...,
        "image": image.asset->url
      }
    },
    expertise {
      ...,
      items[] {
        ...,
        "image": image.asset->url
      }
    },
    testimonials { ... },
    faq { ... },
    articlesTeaser {
      ...,
      "articlesResolved": articles[]->{
        _id,
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        category,
        "image": image.asset->url
      },
      "legacyFeaturedResolved": featuredPosts[]->{
        _id,
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        category,
        "image": image.asset->url
      }
    },
    contact { ... },
    socialShare { ... },
    serviceAreaMap {
      eyebrow,
      title,
      description,
      areas[] {
        countyKey,
        displayName,
        clientCount
      }
    },
    roofInspection {
      kicker,
      titleLine1,
      titleLine2,
      lede,
      "diagramImage": diagramImage { asset->{ url } },
      hotspots[] {
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
    }
  },
  "site": *[_id == "siteSettings"][0]{
    ...,
    "navLogoImage": navLogoImage.asset->url
  },
  "latestPosts": *[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...100] {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    category,
    "image": image.asset->url
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
