import { NavArrowRight } from "iconoir-react";
import { motion } from "motion/react";
import type { CSSProperties } from "react";

import { FALLBACK_ARTICLE_COVER } from "../article/postCoverImage";
import { RichText } from "../portableText/RichText";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import type { ArticlesTeaserProps } from "../types";
import { ArticleCardSharedStyles } from "./ArticleCardSharedStyles";
import { ArticleGridCard } from "./ArticleGridCard";
import { TransitionLink } from "./TransitionLink";

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
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: theme.spacing.xxxxxxxxl,
    color: theme.colors.paper,
    gap: theme.spacing.xxxxxxxxl,
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: theme.spacing.lg,
  };

  const cardBaseStyle: CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.large,
    padding: theme.spacing.xxxxl,
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
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: theme.palette.purple["300"],
                fontSize: "0.75rem",
                marginBottom: theme.spacing.xxl,
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
              gap: theme.spacing.xl,
            }}
          >
            <div style={{ margin: 0, textAlign: "right", width: "100%" }}>
              <RichText
                flow="heading"
                paragraphStyle={{
                  margin: 0,
                  textAlign: "right",
                  lineHeight: 1.6,
                  fontSize: "1.1rem",
                }}
                value={intro ?? DEFAULT_INTRO}
              />
            </div>
            <TransitionLink
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                fontFamily: theme.fonts.headline,
                fontWeight: 800,
                fontSize: "0.6875rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: theme.colors.accent,
                textDecoration: "none",
                borderBottom: `2px solid ${theme.colors.accent}`,
                paddingBottom: theme.spacing.micro,
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
              minHeight: "320px",
              maxWidth: "42rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
            transition={{ duration: 0.5 }}
          >
            <div
              aria-hidden
              className="articles-teaser-card-bg"
              style={{
                position: "absolute",
                inset: 0,
              }}
            >
              {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
              <img
                alt=""
                src={FALLBACK_ARTICLE_COVER}
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
                  fontWeight: 800,
                  fontSize: "1.35rem",
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
                  lineHeight: 1.65,
                  margin: `0 0 ${theme.spacing.xl}`,
                  fontSize: "1rem",
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
                  lineHeight: 1.6,
                  margin: 0,
                  fontSize: "0.9rem",
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
