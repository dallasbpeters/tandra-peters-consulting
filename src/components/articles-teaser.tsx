import { NavArrowRight } from "iconoir-react";
import { motion } from "motion/react";
import type { CSSProperties } from "react";

import { FALLBACK_ARTICLE_COVER } from "../article/post-cover-image";
import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { mix, theme } from "../theme";
import type { ArticlesTeaserProps } from "../types";
import { ArticleCardSharedStyles } from "./article-card-shared-styles";
import { ArticleGridCard } from "./article-grid-card";
import { TransitionLink } from "./transition-link";

const DEFAULT_EYEBROW = "Guides & insights";
const DEFAULT_TITLE = "Roofing articles";
const DEFAULT_INTRO =
  "Latest guides on replacement, insurance, and caring for your Texas roof.";
const DEFAULT_VIEW_ALL = "View all articles";

const studioUrl =
  import.meta.env.VITE_SANITY_STUDIO_URL?.trim() ||
  (import.meta.env.PROD
    ? "https://www.tandra.me/studio"
    : "http://localhost:3333");

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
    alignItems: "start",
    color: theme.colors.paper,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xxxxxxxxl,
    justifyContent: "space-between",
    marginBottom: theme.spacing.xxxxxxxxl,
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gap: theme.spacing.lg,
    gridTemplateColumns: "1fr",
  };

  const cardBaseStyle: CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.large,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "space-between",
    minHeight: "420px",
    overflow: "hidden",
    padding: theme.spacing.xxxxl,
    position: "relative",
    transition: "all 0.5s",
  };

  return (
    <section
      aria-labelledby="articles-heading"
      className={layoutClass.sectionPadded}
      id="articles"
      style={sectionStyle}
    >
      <ArticleCardSharedStyles />
      <div className={layoutClass.containerWide}>
        <motion.div
          className="articles-teaser-md-row"
          initial={{ opacity: 0, y: 20 }}
          style={headerStyle}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div style={{ maxWidth: "42rem" }}>
            <span
              style={{
                color: theme.palette.purple["300"],
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.2em",
                marginBottom: theme.spacing.xxl,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </span>
            <h2
              id="articles-heading"
              style={{
                color: theme.colors.everglade,
                fontFamily: theme.fonts.headlineAlt,
                fontSize: "clamp(2.25rem, 8vw, 3.25rem)",
                fontWeight: 400,
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
          <div
            style={{
              alignItems: "flex-end",
              color: mix(theme.colors.black, 60),
              display: "flex",
              flexDirection: "column",
              fontSize: "1.1rem",
              gap: theme.spacing.xl,
              lineHeight: 1.6,
              maxWidth: "24rem",
            }}
          >
            <div style={{ margin: 0, textAlign: "right", width: "100%" }}>
              <RichText
                flow="heading"
                paragraphStyle={{
                  fontSize: "1.1rem",
                  lineHeight: 1.6,
                  margin: 0,
                  textAlign: "left",
                }}
                value={intro ?? DEFAULT_INTRO}
              />
            </div>
            <TransitionLink
              style={{
                alignItems: "center",
                borderBottom: `2px solid ${theme.colors.accent}`,
                color: theme.colors.accent,
                display: "inline-flex",
                fontFamily: theme.fonts.headline,
                fontSize: "0.6875rem",
                fontWeight: 800,
                gap: theme.spacing.sm,
                letterSpacing: "0.14em",
                paddingBottom: theme.spacing.micro,
                textDecoration: "none",
                textTransform: "uppercase",
              }}
              to="/articles"
              viewTransition
            >
              {viewAllLabel}
              <NavArrowRight
                aria-hidden
                height={16}
                strokeWidth={2}
                width={16}
              />
            </TransitionLink>
          </div>
        </motion.div>

        {hasPosts ? (
          <div className="articles-cards-grid" style={gridStyle}>
            {displayPosts.map((p, i) => (
              <div
                className="articles-cards-grid-item"
                key={p._id}
                style={{ minWidth: 0 }}
              >
                <ArticleGridCard
                  cardIndex={i}
                  layout={i === 0 ? "featured" : "standard"}
                  post={p}
                />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="articles-teaser-card"
            initial={{ opacity: 0, y: 16 }}
            style={{
              ...cardBaseStyle,
              marginLeft: "auto",
              marginRight: "auto",
              maxWidth: "42rem",
              minHeight: "320px",
            }}
            transition={{ duration: 0.5 }}
          >
            <div
              aria-hidden
              className="articles-teaser-card-bg"
              style={{
                inset: 0,
                position: "absolute",
              }}
            >
              {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
              <img
                alt=""
                decoding="async"
                loading="lazy"
                src={FALLBACK_ARTICLE_COVER}
                style={{
                  height: "100%",
                  objectFit: "cover",
                  width: "100%",
                }}
              />
            </div>
            <div style={{ position: "relative", zIndex: 10 }}>
              <h3
                style={{
                  color: theme.colors.white,
                  fontFamily: theme.fonts.headline,
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  lineHeight: 1.25,
                  margin: `0 0 ${theme.spacing.lg}`,
                  textTransform: "uppercase",
                }}
              >
                No articles in the dataset yet
              </h3>
              <p
                style={{
                  color: mix(theme.colors.white, 85),
                  fontSize: "1rem",
                  lineHeight: 1.65,
                  margin: `0 0 ${theme.spacing.xl}`,
                }}
              >
                The homepage reads the latest{" "}
                <strong style={{ color: theme.colors.white }}>post</strong>{" "}
                documents from Sanity. Publish at least one article in Studio,
                or seed demo posts from the studio project.
              </p>
              <p
                style={{
                  color: mix(theme.colors.white, 70),
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                <a
                  href={studioUrl}
                  rel="noopener noreferrer"
                  style={{
                    color: theme.colors.accentLight,
                    fontWeight: 800,
                  }}
                  target="_blank"
                >
                  Open Sanity Studio
                </a>
                {import.meta.env.DEV ? (
                  <>
                    {" "}
                    · from{" "}
                    <code style={{ color: theme.colors.accentLight }}>
                      studio-tandra-peters
                    </code>{" "}
                    run{" "}
                    <code style={{ color: theme.colors.accentLight }}>
                      pnpm seed:posts
                    </code>
                  </>
                ) : null}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
