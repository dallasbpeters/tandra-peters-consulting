import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { NavArrowLeft } from "iconoir-react";
import { ArticleRichTextLinkStyles } from "../components/ArticleRichTextLinkStyles";
import { SitePageChrome } from "../components/SitePageChrome";
import { TransitionLink } from "../components/TransitionLink";
import { ArticleJsonLd } from "../components/ArticleJsonLd";
import { RichText } from "../portableText/RichText";
import { useSanityPostBySlug } from "../hooks/useSanityPostBySlug";
import { layoutClass } from "../styles/layoutClasses";
import { typeStyles } from "../styles/siteTypography";
import { theme } from "../theme";
import { postCategoryLabel } from "../article/categoryLabels";
import { SocialShareBar } from "../components/SocialShareBar";
import { ContactSmall } from "../components/ContactSmall";
import { CONTACT_SERVICE_OPTIONS } from "../contactServiceOptions";

const formatDate = (iso: string | undefined) => {
  if (!iso) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

export const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { post, loading, error } = useSanityPostBySlug(slug);

  useEffect(() => {
    if (!post) {
      return;
    }
    const baseTitle = "Tandra Peters | BirdCreek Roofing Consultant | Austin, TX";
    document.title = `${post.title} | Tandra Peters`;
    const desc =
      post.seoDescription?.trim() || post.excerpt?.trim() || post.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", desc);
    }
    return () => {
      document.title = baseTitle;
    };
  }, [post]);

  if (!slug) {
    return (
      <SitePageChrome>
        <main className={`${layoutClass.pageMainArticle} site-articles-route`}>
          <div className={layoutClass.containerArticle}>
            <p>Missing article link.</p>
            <TransitionLink
              to="/articles"
              viewTransition
            >
              Back to articles
            </TransitionLink>
          </div>
        </main>
      </SitePageChrome>
    );
  }

  if (loading) {
    return (
      <SitePageChrome>
        <main className={`${layoutClass.pageMainArticle} site-articles-route`}>
          <div className={layoutClass.containerArticle}>
            <p style={{ color: theme.colors.evergladeMuted }}>Loading…</p>
          </div>
        </main>
      </SitePageChrome>
    );
  }

  if (error || !post) {
    return (
      <SitePageChrome>
        <main className={`${layoutClass.pageMainArticle} site-articles-route`}>
          <div className={layoutClass.containerArticle}>
            <h1
              style={{
                fontFamily: theme.fonts.headline,
                fontSize: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              Article not found
            </h1>
            <p style={{ marginBottom: "1.5rem", color: theme.colors.evergladeMuted }}>
              This article may have moved or is not published yet.
            </p>
            <TransitionLink
              to="/articles"
              viewTransition
              style={{ color: theme.colors.everglade, fontWeight: 700 }}
            >
              ← All articles
            </TransitionLink>
          </div>
        </main>
      </SitePageChrome>
    );
  }

  const path = `/articles/${post.slug}`;

  return (
    <SitePageChrome>
      <ArticleRichTextLinkStyles />
      <ArticleJsonLd post={post} path={path} />
      <main className={`${layoutClass.pageMainArticle} site-articles-route`}>
        <article className={layoutClass.containerArticle}>
          <TransitionLink
            to="/articles"
            viewTransition
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              marginBottom: "1.75rem",
              fontFamily: theme.fonts.headline,
              fontWeight: 700,
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.colors.everglade,
              textDecoration: "none",
            }}
          >
            <NavArrowLeft width={16} height={16} strokeWidth={2} aria-hidden />
            All articles
          </TransitionLink>

          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: theme.palette.purple["300"],
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            {postCategoryLabel(post.category)}
          </span>

          <h1 style={typeStyles.articleDetailTitle}>{post.title}</h1>

          <p
            style={{
              fontSize: "0.9rem",
              color: theme.palette.paper["700"],
              marginBottom: "2rem",
            }}
          >
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
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
                marginBottom: "2rem",
                borderRadius: "0.5rem",
                overflow: "hidden",
                backgroundColor: theme.colors.paperDark,
              }}
            >
              <img
                src={post.image}
                alt=""
                style={{ width: "100%", aspectRatio: "5/3", objectFit: "cover", height: "auto", display: "block" }}
              />
            </div>
          ) : null}

          <div
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.75,
              color: theme.colors.everglade,
            }}
          >
            <RichText
              className="article-rich-text"
              value={post.body}
              paragraphStyle={{
                marginBottom: "1.1rem",
                color: "inherit",
                lineHeight: "inherit",
                fontSize: "inherit",
              }}
              heading2Style={{
                fontFamily: theme.fonts.headline,
                fontSize: "1.25rem",
                marginTop: "2rem",
                marginBottom: "0.75rem",
                color: theme.colors.everglade,
              }}
              heading3Style={{
                fontFamily: theme.fonts.headline,
                fontSize: "1.05rem",
                marginTop: "1.5rem",
                color: theme.colors.everglade,
              }}
              linkStyle={{ 
                color: theme.palette.blue["600"],
                textDecorationThickness: ".15em",
                textDecorationSkipInk: "all",
                paddingInline: ".25em",
                backgroundColor: theme.palette.blue[100]
              }}
            />
          </div>
        </article>
      </main>
      <SocialShareBar
        heading="Know someone who could benefit from this article?"
        shareText={
          post.excerpt?.trim()
            ? `${post.title} — ${post.excerpt.trim()}`
            : post.title
        }
      />
      <ContactSmall
        title="Get a free consultation."
        serviceOptions={CONTACT_SERVICE_OPTIONS}
        formLabels={{
          name: "Your Name",
          email: "Your Email",
          message: "Your Message",
        }}
      />
    </SitePageChrome>
  );
};
