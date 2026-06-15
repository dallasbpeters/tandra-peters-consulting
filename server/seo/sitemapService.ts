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

type SitemapPost = {
  slug?: string | null;
  _updatedAt?: string | null;
  publishedAt?: string | null;
};

const normalizeOrigin = (value?: string): string =>
  (value?.trim() || DEFAULT_SITE_URL).replace(/\/$/, "");

const toIsoDate = (value?: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
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
  if (lastmod) tags.push(`<lastmod>${lastmod}</lastmod>`);
  if (changefreq) tags.push(`<changefreq>${changefreq}</changefreq>`);
  if (priority) tags.push(`<priority>${priority}</priority>`);

  return `<url>${tags.join("")}</url>`;
};

export const generateSitemapXml = async (siteUrlEnv?: string): Promise<string> => {
  const origin = normalizeOrigin(siteUrlEnv);

  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  });

  const posts = (await client.fetch(SITEMAP_POSTS_QUERY)) as SitemapPost[];
  const uniquePosts = new Map<string, SitemapPost>();

  for (const post of posts) {
    const slug = post.slug?.trim();
    if (!slug) continue;
    uniquePosts.set(slug, post);
  }

  const staticUrls = [
    buildUrlEntry({
      loc: `${origin}/`,
      changefreq: "weekly",
      priority: "1.0",
    }),
    buildUrlEntry({
      loc: `${origin}/articles`,
      changefreq: "weekly",
      priority: "0.9",
    }),
    buildUrlEntry({
      loc: `${origin}/insurance-faqs`,
      changefreq: "monthly",
      priority: "0.6",
    }),
    buildUrlEntry({
      loc: `${origin}/roof-inspection`,
      changefreq: "monthly",
      priority: "0.6",
    }),
    buildUrlEntry({
      loc: `${origin}/privacy`,
      changefreq: "monthly",
      priority: "0.3",
    }),
    buildUrlEntry({
      loc: `${origin}/terms`,
      changefreq: "monthly",
      priority: "0.3",
    }),
    buildUrlEntry({
      loc: `${origin}/cookies`,
      changefreq: "monthly",
      priority: "0.3",
    }),
  ];

  const postUrls = [...uniquePosts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([slug, post]) =>
      buildUrlEntry({
        loc: `${origin}/articles/${encodeURIComponent(slug)}`,
        lastmod: toIsoDate(post._updatedAt ?? post.publishedAt),
        changefreq: "monthly",
        priority: "0.7",
      }),
    );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...postUrls,
    "</urlset>",
  ].join("");
};
