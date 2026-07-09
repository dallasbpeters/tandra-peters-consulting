import { createClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const DEFAULT_SITE_URL = "https://www.tandra.me";

const SITEMAP_POSTS_QUERY = `*[_type == "post" && defined(slug.current)]{
  "slug": slug.current,
  "_updatedAt": _updatedAt,
  "publishedAt": publishedAt
}`;

interface SitemapPost {
  _updatedAt?: string | null;
  publishedAt?: string | null;
  slug?: string | null;
}

const TRAILING_SLASH_RE = /\/$/;

const normalizeOrigin = (value?: string): string =>
  (value?.trim() || DEFAULT_SITE_URL).replace(TRAILING_SLASH_RE, "");

const toIsoDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const xmlEscape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const buildUrlEntry = ({
  loc,
  lastmod,
  changefreq,
  priority,
}: {
  loc: string;
  lastmod?: string | null;
  changefreq?: "weekly" | "monthly";
  priority?: string;
}): string => {
  const tags = [`<loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) {
    tags.push(`<lastmod>${lastmod}</lastmod>`);
  }
  if (changefreq) {
    tags.push(`<changefreq>${changefreq}</changefreq>`);
  }
  if (priority) {
    tags.push(`<priority>${priority}</priority>`);
  }

  return `<url>${tags.join("")}</url>`;
};

export const generateSitemapXml = async (
  siteUrlEnv?: string
): Promise<string> => {
  const origin = normalizeOrigin(siteUrlEnv);

  const client = createClient({
    apiVersion: SANITY_API_VERSION,
    dataset: SANITY_DATASET,
    projectId: SANITY_PROJECT_ID,
    useCdn: true,
  });

  const posts = (await client.fetch(SITEMAP_POSTS_QUERY)) as SitemapPost[];
  const uniquePosts = new Map<string, SitemapPost>();

  for (const post of posts) {
    const slug = post.slug?.trim();
    if (!slug) {
      continue;
    }
    uniquePosts.set(slug, post);
  }

  const staticUrls = [
    buildUrlEntry({
      changefreq: "weekly",
      loc: `${origin}/`,
      priority: "1.0",
    }),
    buildUrlEntry({
      changefreq: "weekly",
      loc: `${origin}/articles`,
      priority: "0.9",
    }),
    buildUrlEntry({
      changefreq: "monthly",
      loc: `${origin}/insurance-faqs`,
      priority: "0.6",
    }),
    buildUrlEntry({
      changefreq: "monthly",
      loc: `${origin}/roof-inspection`,
      priority: "0.6",
    }),
    buildUrlEntry({
      changefreq: "monthly",
      loc: `${origin}/privacy`,
      priority: "0.3",
    }),
    buildUrlEntry({
      changefreq: "monthly",
      loc: `${origin}/terms`,
      priority: "0.3",
    }),
    buildUrlEntry({
      changefreq: "monthly",
      loc: `${origin}/cookies`,
      priority: "0.3",
    }),
  ];

  const postUrls = [...uniquePosts.entries()]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .map(([slug, post]) =>
      buildUrlEntry({
        changefreq: "monthly",
        lastmod: toIsoDate(post._updatedAt ?? post.publishedAt),
        loc: `${origin}/articles/${encodeURIComponent(slug)}`,
        priority: "0.7",
      })
    );

  return [
    " ",
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...postUrls,
    "</urlset>",
  ].join("");
};
