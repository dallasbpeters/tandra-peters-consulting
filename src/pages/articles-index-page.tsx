import { motion } from "motion/react";
import type { CSSProperties } from "react";

import { ArticleCardSharedStyles } from "../components/article-card-shared-styles";
import { ArticleGridCard } from "../components/article-grid-card";
import { SitePageChrome } from "../components/site-page-chrome";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityArticlesIndex } from "../hooks/use-sanity-articles-index";
import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { typeStyles } from "../styles/site-typography";
import { theme } from "../theme";

const FALLBACK_PAGE_TITLE = "Articles";
const FALLBACK_INTRO =
  "Practical guides on roof replacement, inspections, insurance, and Texas weather—written from a consultant perspective aligned with Birdcreek Roofing’s homeowner-first process.";

const gridStyle: CSSProperties = {
  display: "grid",
  gap: theme.spacing.lg,
  gridTemplateColumns: "1fr",
  marginTop: theme.spacing.sm,
};

export const ArticlesIndexPage = () => {
  const { page, posts, loading, error } = useSanityArticlesIndex();

  const heading = page?.pageTitle?.trim() || FALLBACK_PAGE_TITLE;
  usePageMetadata({
    description: page?.seoDescription?.trim() || FALLBACK_INTRO,
    title:
      page?.seoTitle?.trim() ||
      (heading ? `${heading} | Tandra Peters` : "Articles | Tandra Peters"),
  });

  return (
    <SitePageChrome>
      <ArticleCardSharedStyles />
      <div className={layoutClass.containerWide}>
        <h1 style={typeStyles.pageListTitle}>{heading}</h1>
        <div style={typeStyles.pageListIntro}>
          <RichText
            paragraphStyle={{ margin: 0 }}
            value={page?.intro?.length ? page.intro : FALLBACK_INTRO}
          />
        </div>

        {loading ? (
          <p style={{ color: theme.colors.evergladeMuted }}>
            Loading articles…
          </p>
        ) : null}
        {error ? (
          <p style={{ color: theme.colors.evergladeMuted }}>
            Could not load articles. Please try again later.
          </p>
        ) : null}

        {!(loading || error) && posts.length === 0 ? (
          <p style={{ color: theme.colors.evergladeMuted }}>
            No published articles to show. In Sanity Studio, open each post and
            click Publish (drafts are hidden on the public site). For local
            preview of drafts, add{" "}
            <code style={{ fontSize: "0.9em" }}>
              VITE_SANITY_API_READ_TOKEN
            </code>{" "}
            to <code style={{ fontSize: "0.9em" }}>.env.local</code>.
          </p>
        ) : null}

        {!(loading || error) && posts.length > 0 ? (
          <div className="articles-cards-grid" style={gridStyle}>
            {posts.map((p, i) => (
              <motion.div
                animate={{ y: 0 }}
                className="articles-cards-grid-item"
                initial={false}
                key={p._id}
                style={{ minWidth: 0 }}
                transition={{
                  delay: Math.min(i * 0.05, 0.5),
                  duration: 0.45,
                }}
              >
                <ArticleGridCard cardIndex={i} layout="standard" post={p} />
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </SitePageChrome>
  );
};
