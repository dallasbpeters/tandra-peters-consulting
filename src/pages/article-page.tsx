import { NavArrowLeft } from "iconoir-react";
import { useParams } from "react-router-dom";

import { CONTACT_SERVICE_OPTIONS } from "../../contactServiceOptions";
import { buildArticleFaqProps } from "../article/build-article-faq";
import { postCategoryLabel } from "../article/category-labels";
import { postCoverImageSrc } from "../article/post-cover-image";
import { ArticleJsonLd } from "../components/article-json-ld";
import { ArticleRichTextLinkStyles } from "../components/article-rich-text-link-styles";
import { ContactSmall } from "../components/contact-small";
import { Faq } from "../components/faq";
import { SitePageChrome } from "../components/site-page-chrome";
import { SocialShareBar } from "../components/social-share-bar";
import { TransitionLink } from "../components/transition-link";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityPostBySlug } from "../hooks/use-sanity-post-by-slug";
import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { typeStyles } from "../styles/site-typography";
import { theme } from "../theme";

const formatDate = (iso: string | undefined) => {
  if (!iso) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

export const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { post, loading, error } = useSanityPostBySlug(slug);
  usePageMetadata({
    description:
      post?.seoDescription?.trim() ||
      post?.excerpt?.trim() ||
      "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight — from consultation through installation.",
    title: post
      ? `${post.title} | Tandra Peters`
      : "Tandra Peters | Birdcreek Roofing Consultant | Austin, TX",
    type: post ? "article" : "website",
  });

  if (!slug) {
    return (
      <SitePageChrome>
        <div className={layoutClass.containerArticle}>
          <p>Missing article link.</p>
          <TransitionLink to="/articles" viewTransition>
            Back to articles
          </TransitionLink>
        </div>
      </SitePageChrome>
    );
  }

  if (loading) {
    return (
      <SitePageChrome>
        <div className={layoutClass.containerArticle}>
          <p style={{ color: theme.colors.evergladeMuted }}>Loading…</p>
        </div>
      </SitePageChrome>
    );
  }

  if (error || !post) {
    return (
      <SitePageChrome>
        <div className={layoutClass.containerArticle}>
          <h1
            style={{
              fontFamily: theme.fonts.headline,
              fontSize: "1.5rem",
              letterSpacing: "0.01em",
              marginBottom: theme.spacing.lg,
            }}
          >
            Article not found
          </h1>
          <p
            style={{
              color: theme.colors.evergladeMuted,
              marginBottom: theme.spacing.xxl,
            }}
          >
            This article may have moved or is not published yet.
          </p>
          <TransitionLink
            style={{ color: theme.colors.everglade, fontWeight: 800 }}
            to="/articles"
            viewTransition
          >
            ← All articles
          </TransitionLink>
        </div>
      </SitePageChrome>
    );
  }

  const path = `/articles/${post.slug}`;
  const articleFaqProps = buildArticleFaqProps(post);

  return (
    <SitePageChrome>
      <ArticleRichTextLinkStyles />
      <ArticleJsonLd path={path} post={post} />
      <article className={layoutClass.containerArticle}>
        <TransitionLink
          style={{
            alignItems: "center",
            color: theme.colors.everglade,
            display: "inline-flex",
            fontFamily: theme.fonts.headline,
            fontSize: "0.65rem",
            fontWeight: 700,
            gap: theme.spacing.sm,
            letterSpacing: "0.14em",
            marginBottom: theme.spacing.xxxl,
            textDecoration: "none",
            textTransform: "uppercase",
          }}
          to="/articles"
          viewTransition
        >
          <NavArrowLeft aria-hidden height={16} strokeWidth={2} width={16} />
          All articles
        </TransitionLink>
        <div style={{ marginBottom: theme.spacing.sm }}>
          <span
            style={{
              borderRadius: theme.radius.large,
              boxShadow: `0 0 0 1px ${theme.palette.purple[300]}`,
              color: theme.palette.purple["300"],
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: `${theme.spacing.nudge} ${theme.spacing.sm}`,
              textTransform: "uppercase",
            }}
          >
            {postCategoryLabel(post.category)}
          </span>
        </div>

        <h1 style={typeStyles.articleDetailTitle}>{post.title}</h1>

        <p
          style={{
            color: theme.palette.paper["700"],
            fontSize: "0.9rem",
            marginBottom: theme.spacing.xxxxl,
          }}
        >
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          {post.authorName ? (
            <>
              {" · "}
              {post.authorName}
            </>
          ) : null}
        </p>

        {post.image ? (
          <div
            style={{
              backgroundColor: theme.colors.paperDark,
              borderRadius: theme.radius.medium,
              marginBottom: theme.spacing.xxxxl,
              overflow: "hidden",
            }}
          >
            {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
            <img
              alt=""
              src={postCoverImageSrc(post.image, { fit: "max", w: 1200 })}
              style={{
                aspectRatio: "5/3",
                display: "block",
                height: "auto",
                objectFit: "cover",
                width: "100%",
              }}
            />
          </div>
        ) : null}

        <div
          style={{
            color: theme.colors.everglade,
            fontSize: "1.05rem",
            lineHeight: 1.75,
          }}
        >
          <RichText
            className="article-rich-text"
            heading2Style={{
              color: theme.colors.everglade,
              fontFamily: theme.fonts.headline,
              fontSize: "1.25rem",
              marginBottom: theme.spacing.md,
              marginTop: theme.spacing.xxxxl,
            }}
            heading3Style={{
              color: theme.colors.everglade,
              fontFamily: theme.fonts.headline,
              fontSize: "1.05rem",
              marginTop: theme.spacing.xxl,
            }}
            linkStyle={{
              backgroundColor: theme.palette.blue[100],
              color: theme.palette.blue["600"],
              paddingInline: ".25em",
              textDecorationSkipInk: "all",
              textDecorationThickness: ".15em",
            }}
            paragraphStyle={{
              color: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              marginBottom: theme.spacing.xl,
            }}
            value={post.body}
          />
        </div>
      </article>
      <Faq {...articleFaqProps} paddingTop="0" />
      <SocialShareBar
        heading="Know someone who could benefit from this article?"
        shareText={
          post.excerpt?.trim()
            ? `${post.title} — ${post.excerpt.trim()}`
            : post.title
        }
      />
      <ContactSmall
        formLabels={{
          email: "Your Email",
          message: "Your Message",
          name: "Your Name",
        }}
        serviceOptions={CONTACT_SERVICE_OPTIONS}
        title="Get a free consultation."
      />
    </SitePageChrome>
  );
};
