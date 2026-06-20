import { usePostHog } from "@posthog/react";
import type { CSSProperties } from "react";

import { postCategoryLabel } from "../article/category-labels";
import {
  FALLBACK_ARTICLE_COVER,
  formatArticleCardDate,
  postCoverImageSrc,
} from "../article/post-cover-image";
import { mix, theme } from "../theme";
import type { PostListItem } from "../types/article";
import { TransitionLink } from "./transition-link";

const cardBaseStyle: CSSProperties = {
  backgroundColor: theme.colors.black,
  borderRadius: theme.radius.large,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  justifyContent: "space-between",
  minHeight: "420px",
  opacity: 1,
  overflow: "hidden",
  padding: theme.spacing.xxxxl,
  position: "relative",
  transition: "all 0.5s",
};

const mainCardStyle: CSSProperties = {
  ...cardBaseStyle,
  minHeight: "500px",
};

export interface ArticleGridCardProps {
  /** Zero-based; displayed as 01, 02, … on the card */
  cardIndex: number;
  layout?: "featured" | "standard";
  post: PostListItem;
}

export const ArticleGridCard = ({
  post,
  cardIndex,
  layout = "standard",
}: ArticleGridCardProps) => {
  const posthog = usePostHog();
  const isMain = layout === "featured";
  const imgSrc =
    postCoverImageSrc(post.image, {
      fit: "crop",
      h: isMain ? 500 : 420,
      w: isMain ? 800 : 600,
    }) ?? FALLBACK_ARTICLE_COVER;
  const indexLabel = String(cardIndex + 1).padStart(2, "0");

  return (
    <TransitionLink
      aria-label={`Read article: ${post.title}`}
      onClick={() =>
        posthog?.capture("article_card_clicked", {
          article_category: post.category,
          article_slug: post.slug,
          article_title: post.title,
          card_index: cardIndex,
          card_layout: layout,
        })
      }
      style={{
        color: "inherit",
        display: "block",
        height: "100%",
        textDecoration: "none",
      }}
      to={`/articles/${post.slug}`}
      viewTransition
    >
      <div
        className="articles-teaser-card"
        style={isMain ? mainCardStyle : cardBaseStyle}
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
            src={imgSrc}
            style={{
              height: "100%",
              objectFit: "cover",
              opacity: 1,
              width: "100%",
            }}
          />
          <div
            className="articles-teaser-card-overlay"
            style={{
              background:
                "linear-gradient(180deg, rgba(0, 0, 0, 0.58) 0%, rgba(0, 0, 0, 0.82) 100%)",
              inset: 0,
              opacity: 1,
              position: "absolute",
              transition: "opacity 0.35s ease",
            }}
          />
        </div>
        <div style={{ position: "relative", zIndex: 10 }}>
          <span
            style={{
              color: theme.colors.purple,
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              marginBottom: theme.spacing.md,
              textTransform: "uppercase",
            }}
          >
            {postCategoryLabel(post.category)}
          </span>
          <h3
            style={{
              color: theme.colors.white,
              fontFamily: theme.fonts.headline,
              fontSize: isMain ? "2.25rem" : "1.85rem",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: `0 0 ${theme.spacing.lg}`,
              textTransform: "uppercase",
            }}
          >
            {post.title}
          </h3>
          {post.excerpt ? (
            <p
              style={{
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: isMain ? 4 : 3,
                color: theme.colors.white,
                display: "-webkit-box",
                fontSize: "1rem",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: isMain ? "28rem" : "none",
                overflow: "hidden",
              }}
            >
              {post.excerpt}
            </p>
          ) : null}
        </div>
        <div
          style={{
            alignItems: "flex-end",
            display: "flex",
            gap: theme.spacing.lg,
            justifyContent: "space-between",
            marginTop: theme.spacing.xxl,
            position: "relative",
            zIndex: 10,
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
            aria-hidden
            style={{
              color: "rgba(255, 255, 255, 0.35)",
              fontFamily: theme.fonts.headline,
              fontSize: isMain ? "5rem" : "3.5rem",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {indexLabel}
          </span>
        </div>
      </div>
    </TransitionLink>
  );
};
