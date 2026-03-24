import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { NavArrowRight } from "iconoir-react";
import { TransitionLink } from "./TransitionLink";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import type { ArticlesTeaserProps } from "../types";
import { FALLBACK_ARTICLE_COVER } from "../article/postCoverImage";
import { RichText } from "../portableText/RichText";
import { ArticleCardSharedStyles } from "./ArticleCardSharedStyles";
import { ArticleGridCard } from "./ArticleGridCard";

const DEFAULT_EYEBROW = "Guides & insights";
const DEFAULT_TITLE = "Roofing articles";
const DEFAULT_INTRO =
  "Latest guides on replacement, insurance, and caring for your Texas roof.";
const DEFAULT_VIEW_ALL = "View all articles";

const studioUrl =
  import.meta.env.VITE_SANITY_STUDIO_URL?.trim() ||
  (import.meta.env.PROD ? "https://www.tandra.me/studio" : "http://localhost:3333");

export const ArticlesTeaser = ({
  posts,
  eyebrow = DEFAULT_EYEBROW,
  title = DEFAULT_TITLE,
  intro,
  viewAllLabel = DEFAULT_VIEW_ALL,
}: ArticlesTeaserProps) => {
  const displayPosts = posts;
  const hasPosts = displayPosts.length > 0;

  const sectionStyle: CSSProperties = {
    backgroundColor: theme.palette.paper["100"],
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "3rem",
    color: theme.colors.paper,
    gap: "3rem",
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
  };

  const cardBaseStyle: CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: "1rem",
    padding: "2rem",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.5s",
    minHeight: "420px",
    height: "100%",
  };


  return (
    <section
      id="articles"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="articles-heading"
    >
      <ArticleCardSharedStyles />
      <div className={layoutClass.containerWide}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={headerStyle}
          className="articles-teaser-md-row"
        >
          <div style={{ maxWidth: "42rem" }}>
            <span
              style={{
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: theme.palette.purple["300"],
                fontSize: "0.75rem",
                marginBottom: "1.5rem",
                display: "block",
              }}
            >
              {eyebrow}
            </span>
            <h2
              id="articles-heading"
              style={{
                fontSize: "clamp(2.25rem, 8vw, 3.25rem)",
                lineHeight: 1.05,
                fontFamily: theme.fonts.headlineAlt,
                fontWeight: 400,
                color: theme.colors.everglade,
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
          <div
            style={{
              maxWidth: "24rem",
              color: mix(theme.colors.black, 60),
              lineHeight: 1.6,
              fontSize: "1.1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "1.25rem",
            }}
          >
            <div style={{ margin: 0, textAlign: "right", width: "100%" }}>
              <RichText
                value={intro ?? DEFAULT_INTRO}
                flow="heading"
                paragraphStyle={{
                  margin: 0,
                  textAlign: "right",
                  lineHeight: 1.6,
                  fontSize: "1.1rem",
                }}
              />
            </div>
            <TransitionLink
              to="/articles"
              viewTransition
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontFamily: theme.fonts.headline,
                fontWeight: 700,
                fontSize: "0.6875rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: theme.colors.accent,
                textDecoration: "none",
                borderBottom: `2px solid ${theme.colors.accent}`,
                paddingBottom: "0.15rem",
              }}
            >
              {viewAllLabel}
              <NavArrowRight width={16} height={16} strokeWidth={2} aria-hidden />
            </TransitionLink>
          </div>
        </motion.div>

        {!hasPosts ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="articles-teaser-card"
            style={{
              ...cardBaseStyle,
              minHeight: "320px",
              maxWidth: "42rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
              }}
              className="articles-teaser-card-bg"
              aria-hidden
            >
              <img
                src={FALLBACK_ARTICLE_COVER}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
            <div style={{ position: "relative", zIndex: 10 }}>
              <h3
                style={{
                  color: theme.colors.white,
                  fontFamily: theme.fonts.headline,
                  fontWeight: 700,
                  fontSize: "1.35rem",
                  lineHeight: 1.25,
                  margin: "0 0 1rem",
                  textTransform: "uppercase",
                }}
              >
                No articles in the dataset yet
              </h3>
              <p
                style={{
                  color: mix(theme.colors.white, 85),
                  lineHeight: 1.65,
                  margin: "0 0 1.25rem",
                  fontSize: "1rem",
                }}
              >
                The homepage reads the latest <strong style={{ color: theme.colors.white }}>post</strong> documents from Sanity. Publish at least one article in Studio, or seed demo posts from the studio project.
              </p>
              <p
                style={{
                  color: mix(theme.colors.white, 70),
                  lineHeight: 1.6,
                  margin: 0,
                  fontSize: "0.9rem",
                }}
              >
                <a
                  href={studioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: theme.colors.accentLight,
                    fontWeight: 700,
                  }}
                >
                  Open Sanity Studio
                </a>
                {import.meta.env.DEV ? (
                  <>
                    {" "}
                    · from <code style={{ color: theme.colors.accentLight }}>studio-tandra-peters</code> run{" "}
                    <code style={{ color: theme.colors.accentLight }}>pnpm seed:posts</code>
                  </>
                ) : null}
              </p>
            </div>
          </motion.div>
        ) : (
        <div style={gridStyle} className="articles-cards-grid">
          {displayPosts.map((p, i) => (
            <div
              key={p._id}
              className="articles-cards-grid-item"
              style={{ minWidth: 0 }}
            >
              <ArticleGridCard
                post={p}
                cardIndex={i}
                layout={i === 0 ? "featured" : "standard"}
              />
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
};
