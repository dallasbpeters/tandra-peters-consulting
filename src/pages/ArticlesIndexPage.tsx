import { useEffect, type CSSProperties } from "react";
import { motion } from "motion/react";
import { SitePageChrome } from "../components/SitePageChrome";
import { ArticleCardSharedStyles } from "../components/ArticleCardSharedStyles";
import { ArticleGridCard } from "../components/ArticleGridCard";
import { useSanityArticlesIndex } from "../hooks/useSanityArticlesIndex";
import { RichText } from "../portableText/RichText";
import { layoutClass } from "../styles/layoutClasses";
import { typeStyles } from "../styles/siteTypography";
import { theme } from "../theme";

const FALLBACK_PAGE_TITLE = "Articles";
const FALLBACK_INTRO =
  "Practical guides on roof replacement, inspections, insurance, and Texas weather—written from a consultant perspective aligned with BirdCreek Roofing’s homeowner-first process.";

const SITE_TITLE_SUFFIX = "Tandra Peters | BirdCreek Roofing Consultant | Austin, TX";

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "1rem",
  marginTop: "0.5rem",
};

export const ArticlesIndexPage = () => {
  const { page, posts, loading, error } = useSanityArticlesIndex();

  const heading = page?.pageTitle?.trim() || FALLBACK_PAGE_TITLE;

  useEffect(() => {
    const tabTitle =
      page?.seoTitle?.trim() ||
      (heading ? `${heading} | Tandra Peters` : `Articles | Tandra Peters`);
    document.title = tabTitle;
    const desc =
      page?.seoDescription?.trim() || FALLBACK_INTRO;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", desc);
    }
    return () => {
      document.title = SITE_TITLE_SUFFIX;
    };
  }, [page?.seoTitle, page?.seoDescription, heading]);

  return (
    <SitePageChrome>
      <ArticleCardSharedStyles />
      <main className={`${layoutClass.pageMain} site-articles-route`}>
        <div className={layoutClass.containerWide}>
          <h1 style={typeStyles.pageListTitle}>{heading}</h1>
          <div style={typeStyles.pageListIntro}>
            <RichText
              value={page?.intro?.length ? page.intro : FALLBACK_INTRO}
              paragraphStyle={{ margin: 0 }}
            />
          </div>

          {loading ? (
            <p style={{ color: theme.colors.evergladeMuted }}>Loading articles…</p>
          ) : null}
          {error ? (
            <p style={{ color: theme.colors.evergladeMuted }}>
              Could not load articles. Please try again later.
            </p>
          ) : null}

          {!loading && !error && posts.length === 0 ? (
            <p style={{ color: theme.colors.evergladeMuted }}>
              No published articles to show. In Sanity Studio, open each post and
              click Publish (drafts are hidden on the public site). For local
              preview of drafts, add{" "}
              <code style={{ fontSize: "0.9em" }}>VITE_SANITY_API_READ_TOKEN</code>{" "}
              to <code style={{ fontSize: "0.9em" }}>.env.local</code>.
            </p>
          ) : null}

          {!loading && !error && posts.length > 0 ? (
            <div style={gridStyle} className="articles-cards-grid">
              {posts.map((p, i) => (
                <motion.div
                  key={p._id}
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.5) }}
                  className="articles-cards-grid-item"
                  style={{ minWidth: 0 }}
                >
                  <ArticleGridCard post={p} cardIndex={i} layout="standard" />
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </SitePageChrome>
  );
};
