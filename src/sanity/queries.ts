import groq from "groq";

/** Resolve Sanity image fields to CDN URLs for the Vite app (no @sanity/image-url needed). */
export const HOME_AND_SITE_QUERY = groq`{
  "home": *[_id == "homePage"][0]{
    ...,
    hero {
      ...,
      "backgroundImage": backgroundImage.asset->url
    },
    about {
      ...,
      "image": image.asset->url
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
    contact { ... },
    socialShare { ... }
  },
  "site": *[_id == "siteSettings"][0]{
    ...,
    "navLogoImage": navLogoImage.asset->url
  }
}`;
