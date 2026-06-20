import type { CSSProperties } from "react";

import { useIsMobile } from "../../hooks/is-mobile";
import { layoutClass } from "../../styles/layout-classes";
import { theme } from "../../theme";
import { GoogleLogo } from "./google-logo";
import { MarqueeRow } from "./marquee-row";
import { reviews } from "./reviews-data";

const styles = {
  header: {
    margin: `0 auto ${theme.spacing.xxxxxxxxxxl}`,
    maxWidth: "48rem",
    textAlign: "center",
  },
  kicker: {
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headline,
    fontSize: "0.6875rem",
    fontWeight: 800,
    letterSpacing: "0.16em",
    margin: 0,
    textTransform: "uppercase",
  },
  ratingCount: {
    color: theme.colors.legalMuted,
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
  },
  ratingMeta: {
    alignItems: "center",
    display: "flex",
    gap: theme.spacing.sm,
  },
  ratingRow: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.md,
    justifyContent: "center",
    marginTop: theme.spacing.xxl,
  },
  ratingValue: {
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headline,
    fontSize: "1.125rem",
    fontWeight: 800,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.paper,
    paddingBlock: theme.spacing.sectionWide,
    width: "100%",
  },
  star: {
    height: "1.25rem",
    width: "1.25rem",
  },
  stars: {
    alignItems: "center",
    display: "flex",
    gap: theme.spacing.hairline,
  },
  title: {
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1.15,
    margin: `${theme.spacing.lg} 0 0`,
  },
} satisfies Record<string, CSSProperties>;

const RatingStars = () => (
  <div aria-hidden="true" style={styles.stars}>
    {[1, 2, 3, 4, 5].map((position) => (
      <svg
        aria-hidden="true"
        fill="#FBBC05"
        key={`rating-star-${position}`}
        style={styles.star}
        viewBox="0 0 24 24"
      >
        <path d="M12 2l2.95 6.36 6.99.78-5.2 4.72 1.42 6.86L12 17.77l-6.16 3.95 1.42-6.86-5.2-4.72 6.99-.78L12 2z" />
      </svg>
    ))}
  </div>
);

const MARQUEE_ROW_SIZE = 12;

export const GoogleReviews = () => {
  const isMobile = useIsMobile();
  const firstRow = reviews.slice(0, MARQUEE_ROW_SIZE);
  const secondRow = reviews.slice(MARQUEE_ROW_SIZE, MARQUEE_ROW_SIZE * 2);

  return (
    <section
      aria-labelledby="reviews-heading"
      style={{
        ...styles.section,
        paddingInline: isMobile ? 0 : theme.spacing.xxl,
      }}
    >
      <div className={layoutClass.containerWide}>
        <div style={styles.header}>
          <p style={styles.kicker}>Trusted across Texas</p>
          <h2 id="reviews-heading" style={styles.title}>
            What homeowners say
          </h2>

          <div style={styles.ratingRow}>
            <GoogleLogo style={{ height: "1.75rem", width: "auto" }} />
            <div style={styles.ratingMeta}>
              <span style={styles.ratingValue}>4.8</span>
              <RatingStars />
              <span style={styles.ratingCount}>
                · {reviews.length} reviews shown
              </span>
            </div>
          </div>
        </div>

        <div style={styles.rows}>
          <MarqueeRow reviews={firstRow} />
          <MarqueeRow reverse reviews={secondRow} />
        </div>
      </div>
    </section>
  );
};
