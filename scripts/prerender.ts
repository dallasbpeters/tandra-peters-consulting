/**
 * Post-build static prerender for the SPA.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) and many
 * bots do not execute JS, so a pure client-rendered SPA serves them an empty
 * `<div id="root">`. This script reads the built `dist/index.html` and writes
 * a static HTML file per route with:
 *   - route-specific <title>, meta description, canonical, OG/Twitter tags
 *   - schema.org JSON-LD (RoofingContractor + Person on home; Article + FAQPage
 *     on article pages) baked into <head>
 *   - a server-rendered text summary inside #root so non-JS agents get real,
 *     readable content (React hydrates over it on load)
 *
 * It also emits `dist/llms.txt`, an agent-readable index of the site.
 *
 * Run via tsx (see package.json `build` / `build:vercel`). Network failures to
 * Sanity are non-fatal: static routes are still prerendered.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";

import {
  BUSINESS,
  buildLocalBusinessSchema,
  buildPersonSchema,
  normalizeOrigin,
  PERSON,
  SERVICE_AREAS,
  SERVICES,
} from "../server/seo/businessInfo.js";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(repoRoot, "dist");

// Module-level regex constants (avoids re-compilation on every call).
const RE_WHITESPACE = /\s+/g;
const RE_TITLE_TAG = /<title>[\s\S]*?<\/title>/;
const RE_META_DESCRIPTION = /<meta name="description"[\s\S]*?\/>/;
const RE_LINK_CANONICAL = /<link rel="canonical"[^>]*\/>/;
const RE_OG_TITLE = /<meta property="og:title"[^>]*\/>/;
const RE_OG_DESCRIPTION = /<meta property="og:description"[\s\S]*?\/>/;
const RE_OG_URL = /<meta property="og:url"[^>]*\/>/;
const RE_TWITTER_TITLE = /<meta name="twitter:title"[^>]*\/>/;
const RE_TWITTER_DESCRIPTION = /<meta name="twitter:description"[\s\S]*?\/>/;
const RE_DIV_ROOT = /<div id="root"><\/div>/;
const RE_LEADING_SLASH = /^\//;

const ORIGIN = normalizeOrigin(process.env.VITE_SITE_URL);

const SANITY = {
  projectId: "7irm699i",
  dataset: "production",
  apiVersion: "2026-05-29",
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttr = (value: string): string => escapeHtml(value);

/** Minimal Portable Text → plain text (build script can't use browser deps). */
const portableToPlain = (blocks: unknown): string => {
  if (typeof blocks === "string") {
    return blocks;
  }
  if (!Array.isArray(blocks)) {
    return "";
  }
  return blocks
    .filter((b): b is { _type?: string; children?: { text?: string }[] } =>
      Boolean(b)
    )
    .filter((b) => b._type === "block")
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join("\n\n")
    .trim();
};

const truncate = (value: string, max: number): string => {
  const clean = value.replace(RE_WHITESPACE, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

type Jsonable = Record<string, unknown>;

const jsonLdTag = (data: Jsonable): string =>
  `<script type="application/ld+json">${JSON.stringify(data).replaceAll("</", "<\\/")}</script>`;

interface PageMeta {
  /** Server-rendered, human/agent-readable body injected into #root. */
  bodyHtml: string;
  description: string;
  jsonLd: Jsonable[];
  /** Route path, e.g. "/" or "/articles/foo". */
  route: string;
  title: string;
}

interface PostDoc {
  _updatedAt?: string;
  authorName?: string;
  body?: unknown;
  category?: string;
  excerpt?: string;
  image?: string;
  publishedAt?: string;
  seoDescription?: string;
  slug?: string;
  title?: string;
}

interface FaqItem {
  answer?: unknown;
  question?: string;
}

interface HomeDoc {
  faqItems?: FaqItem[];
  seoDescription?: string;
  seoTitle?: string;
}

const DEFAULT_TITLE =
  "Tandra Peters | Birdcreek Roofing Consultant | Austin, TX";
const DEFAULT_DESCRIPTION =
  "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";

const fetchSanity = async (): Promise<{
  posts: PostDoc[];
  home: HomeDoc | null;
}> => {
  try {
    const client = createClient({ ...SANITY, useCdn: true });
    const [posts, home] = await Promise.all([
      client.fetch<PostDoc[]>(
        `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
          "slug": slug.current, title, excerpt, seoDescription, authorName,
          category, publishedAt, _updatedAt, "image": image.asset->url, body
        }`
      ),
      client.fetch<HomeDoc | null>(
        `*[_type == "homePage"][0]{
          seoTitle, seoDescription, "faqItems": faq.items[]{question, answer}
        }`
      ),
    ]);
    return { posts: posts ?? [], home: home ?? null };
  } catch (error) {
    console.warn(
      "[prerender] Sanity fetch failed; prerendering static routes only.",
      error instanceof Error ? error.message : error
    );
    return { posts: [], home: null };
  }
};

const faqPageSchema = (items: FaqItem[]): Jsonable | null => {
  const entries = items
    .map((item) => ({
      q: (item.question ?? "").trim(),
      a: portableToPlain(item.answer),
    }))
    .filter((entry) => entry.q && entry.a);
  if (entries.length === 0) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };
};

const homePage = (home: HomeDoc | null): PageMeta => {
  const jsonLd: Jsonable[] = [
    buildLocalBusinessSchema(ORIGIN),
    buildPersonSchema(ORIGIN),
  ];
  const faq = home?.faqItems ? faqPageSchema(home.faqItems) : null;
  if (faq) {
    jsonLd.push(faq);
  }

  const serviceList = SERVICES.map(
    (s) =>
      `<li><strong>${escapeHtml(s.name)}:</strong> ${escapeHtml(s.description)}</li>`
  ).join("");
  const areaList = SERVICE_AREAS.map(
    (a) => `<li>${escapeHtml(a.city)} (${escapeHtml(a.county)})</li>`
  ).join("");

  return {
    route: "/",
    title: home?.seoTitle?.trim() || DEFAULT_TITLE,
    description: home?.seoDescription?.trim() || DEFAULT_DESCRIPTION,
    jsonLd,
    bodyHtml: `<main>
      <h1>${escapeHtml(PERSON.name)} — ${escapeHtml(PERSON.jobTitle)}, ${escapeHtml(PERSON.worksFor)}</h1>
      <p>${escapeHtml(PERSON.description)}</p>
      <h2>Services</h2>
      <ul>${serviceList}</ul>
      <h2>Service area</h2>
      <ul>${areaList}</ul>
      <p>Contact: <a href="tel:${escapeAttr(BUSINESS.telephone)}">${escapeHtml(BUSINESS.telephone)}</a> ·
      <a href="mailto:${escapeAttr(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p>
    </main>`,
  };
};

const articlesIndexPage = (posts: PostDoc[]): PageMeta => {
  const items = posts
    .map((post) => {
      const slug = post.slug?.trim();
      if (!slug) {
        return "";
      }
      const desc = post.seoDescription || post.excerpt || "";
      return `<li><a href="/articles/${escapeAttr(slug)}">${escapeHtml(
        post.title ?? slug
      )}</a>${desc ? ` — ${escapeHtml(truncate(desc, 200))}` : ""}</li>`;
    })
    .filter(Boolean)
    .join("");

  return {
    route: "/articles",
    title: "Articles | Tandra Peters Roofing Consulting",
    description:
      "Roofing guides on assessments, insurance claims, inspections, maintenance, and tips for Texas homeowners from Tandra Peters.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Articles",
        url: `${ORIGIN}/articles`,
        isPartOf: { "@type": "WebSite", url: ORIGIN, name: BUSINESS.legalName },
      },
    ],
    bodyHtml: `<main><h1>Articles</h1><ul>${items || "<li>Articles coming soon.</li>"}</ul></main>`,
  };
};

const articlePage = (post: PostDoc): PageMeta | null => {
  const slug = post.slug?.trim();
  if (!slug) {
    return null;
  }
  const url = `${ORIGIN}/articles/${slug}`;
  const description = truncate(
    post.seoDescription || post.excerpt || post.title || "",
    200
  );
  const bodyText = portableToPlain(post.body);

  const articleSchema: Jsonable = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    datePublished: post.publishedAt,
    dateModified: post._updatedAt || post.publishedAt,
    author: { "@type": "Person", name: post.authorName || PERSON.name },
    publisher: {
      "@type": "Organization",
      name: BUSINESS.legalName,
      url: ORIGIN,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(post.image ? { image: [post.image] } : {}),
  };

  const breadcrumb: Jsonable = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Articles",
        item: `${ORIGIN}/articles`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return {
    route: `/articles/${slug}`,
    title: `${post.title} | Tandra Peters`,
    description,
    jsonLd: [articleSchema, breadcrumb],
    bodyHtml: `<main><article>
      <h1>${escapeHtml(post.title ?? "")}</h1>
      ${post.publishedAt ? `<p><time datetime="${escapeAttr(post.publishedAt)}">${escapeHtml(new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</time></p>` : ""}
      ${bodyText
        .split("\n\n")
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("")}
    </article></main>`,
  };
};

/** Inject route-specific head + body into the built index.html template. */
const renderHtml = (template: string, page: PageMeta): string => {
  const canonical = `${ORIGIN}${page.route === "/" ? "/" : page.route}`;
  const title = escapeHtml(page.title);
  const description = escapeAttr(page.description);

  let html = template;

  // <title>
  html = html.replace(RE_TITLE_TAG, `<title>${title}</title>`);

  // meta description
  html = html.replace(
    RE_META_DESCRIPTION,
    `<meta name="description" content="${description}" />`
  );

  // canonical (template already had %SITE_URL%/ replaced at build by html-site-url)
  html = html.replace(
    RE_LINK_CANONICAL,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`
  );

  // OG / Twitter title + description + url (keep images as-is)
  html = html
    .replace(RE_OG_TITLE, `<meta property="og:title" content="${title}" />`)
    .replace(
      RE_OG_DESCRIPTION,
      `<meta property="og:description" content="${description}" />`
    )
    .replace(
      RE_OG_URL,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`
    )
    .replace(
      RE_TWITTER_TITLE,
      `<meta name="twitter:title" content="${title}" />`
    )
    .replace(
      RE_TWITTER_DESCRIPTION,
      `<meta name="twitter:description" content="${description}" />`
    );

  // JSON-LD before </head>
  const jsonLd = page.jsonLd.map(jsonLdTag).join("\n  ");
  html = html.replace("</head>", `  ${jsonLd}\n</head>`);

  // Server-rendered content inside #root (React replaces on load).
  // Wrapped in `hidden` so browsers never paint the unstyled bare HTML while JS
  // is loading, but non-JS parsers (AI/bot crawlers) can still read it in the DOM.
  html = html.replace(
    RE_DIV_ROOT,
    `<div id="root"><div hidden aria-hidden="true">${page.bodyHtml}</div></div>`
  );

  return html;
};

const writeRoute = async (route: string, html: string): Promise<void> => {
  // "/" → dist/index.html ; "/articles" → dist/articles/index.html
  const rel =
    route === "/"
      ? "index.html"
      : `${route.replace(RE_LEADING_SLASH, "")}/index.html`;
  const outPath = path.join(distDir, rel);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
};

const buildLlmsTxt = (posts: PostDoc[]): string => {
  const lines: string[] = [];
  lines.push(`# ${PERSON.name} — ${PERSON.jobTitle}, ${PERSON.worksFor}`);
  lines.push("");
  lines.push(`> ${PERSON.description}`);
  lines.push("");
  lines.push(`- Location: ${BUSINESS.city}, ${BUSINESS.state}`);
  lines.push(`- Phone: ${BUSINESS.telephone}`);
  lines.push(`- Email: ${BUSINESS.email}`);
  lines.push(`- Website: ${ORIGIN}`);
  lines.push("");
  lines.push("## Services");
  for (const service of SERVICES) {
    lines.push(`- **${service.name}**: ${service.description}`);
  }
  lines.push("");
  lines.push("## Service area");
  for (const area of SERVICE_AREAS) {
    lines.push(`- ${area.city} (${area.county}), ${BUSINESS.state}`);
  }
  lines.push("");
  lines.push("## Key pages");
  lines.push(
    `- [Home](${ORIGIN}/): Overview of roofing consultation services.`
  );
  lines.push(
    `- [Articles](${ORIGIN}/articles): Roofing guides for Texas homeowners.`
  );
  lines.push(
    `- [Insurance FAQs](${ORIGIN}/insurance-faqs): Roof insurance claim questions answered.`
  );
  lines.push(
    `- [Roof inspection](${ORIGIN}/roof-inspection): What a roof inspection covers.`
  );
  lines.push("");
  if (posts.length > 0) {
    lines.push("## Articles");
    for (const post of posts) {
      const slug = post.slug?.trim();
      if (!(slug && post.title)) {
        continue;
      }
      const desc = truncate(post.seoDescription || post.excerpt || "", 160);
      lines.push(
        `- [${post.title}](${ORIGIN}/articles/${slug})${desc ? `: ${desc}` : ""}`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
};

const main = async (): Promise<void> => {
  const templatePath = path.join(distDir, "index.html");
  let template: string;
  try {
    template = await readFile(templatePath, "utf8");
  } catch {
    console.error(
      `[prerender] ${templatePath} not found. Run \`vite build\` first.`
    );
    process.exitCode = 1;
    return;
  }

  const { posts, home } = await fetchSanity();

  const pages: PageMeta[] = [homePage(home), articlesIndexPage(posts)];
  for (const post of posts) {
    const page = articlePage(post);
    if (page) {
      pages.push(page);
    }
  }

  let count = 0;
  for (const page of pages) {
    await writeRoute(page.route, renderHtml(template, page));
    count += 1;
  }

  await writeFile(path.join(distDir, "llms.txt"), buildLlmsTxt(posts), "utf8");

  console.log(
    `[prerender] Wrote ${count} static route(s) and llms.txt for origin ${ORIGIN}.`
  );
};

main();
