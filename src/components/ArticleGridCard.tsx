import type { CSSProperties } from "react";
import { TransitionLink } from "./TransitionLink";
import { mix, theme } from "../theme";
import type { PostListItem } from "../types/article";
import { postCategoryLabel } from "../article/categoryLabels";
import {
  FALLBACK_ARTICLE_COVER,
  formatArticleCardDate,
  postCoverImageSrc,
} from "../article/postCoverImage";

const cardBaseStyle: CSSProperties = {
  backgroundColor: theme.colors.black,
  borderRadius: "1rem",
  padding: "2rem",
  position: "relative",
  opacity: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "all 0.5s",
  minHeight: "420px",
  height: "100%",
};

const mainCardStyle: CSSProperties = {
  ...cardBaseStyle,
  minHeight: "500px",
};

export type ArticleGridCardProps = {
  post: PostListItem;
  /** Zero-based; displayed as 01, 02, … on the card */
  cardIndex: number;
  layout?: "featured" | "standard";
};

export const ArticleGridCard = ({
  post,
  cardIndex,
  layout = "standard",
}: ArticleGridCardProps) => {
  const isMain = layout === "featured";
  const imgSrc = postCoverImageSrc(post.image) ?? FALLBACK_ARTICLE_COVER;
  const indexLabel = String(cardIndex + 1).padStart(2, "0");

  return (
    <TransitionLink
      to={`/articles/${post.slug}`}
      viewTransition
      aria-label={`Read article: ${post.title}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        height: "100%",
      }}
    >
      <div
        className="articles-teaser-card"
        style={isMain ? mainCardStyle : cardBaseStyle}
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
            src={imgSrc}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              opacity: 1,
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            className="articles-teaser-card-overlay"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0, 0, 0, 0.58) 0%, rgba(0, 0, 0, 0.82) 100%)",
              opacity: 1,
              transition: "opacity 0.35s ease",
            }}
          />
        </div>
        <div style={{ position: "relative", zIndex: 10 }}>
          <span
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.colors.purple,
              marginBottom: "0.75rem",
            }}
          >
            {postCategoryLabel(post.category)}
          </span>
          <h3
            style={{
              color: theme.colors.white,
              fontSize: isMain ? "2.25rem" : "1.85rem",
              lineHeight: 1.15,
              margin: "0 0 1rem",
              fontFamily: theme.fonts.headline,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {post.title}
          </h3>
          {post.excerpt ? (
            <p
              style={{
                color: theme.colors.white,
                maxWidth: isMain ? "28rem" : "none",
                lineHeight: 1.6,
                fontSize: "1rem",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: isMain ? 4 : 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {post.excerpt}
            </p>
          ) : null}
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <time
            dateTime={post.publishedAt}
            style={{
              color: mix(theme.colors.white, 72),
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {formatArticleCardDate(post.publishedAt)}
          </time>
          <span
            style={{
              color: "rgba(255, 255, 255, 0.35)",
              fontFamily: theme.fonts.headline,
              fontWeight: 900,
              fontSize: isMain ? "5rem" : "3.5rem",
              lineHeight: 1,
            }}
            aria-hidden
          >
            {indexLabel}
          </span>
        </div>
      </div>
    </TransitionLink>
  );
};
