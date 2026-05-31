import type { CSSProperties } from "react";

import { layoutClass } from "../../styles/layoutClasses";
import { theme } from "../../theme";
import { GoogleLogo } from "./google-logo";
import { MarqueeRow } from "./marquee-row";
import { reviews } from "./reviews-data";

const styles = {
  section: {
    width: "100%",
    paddingBlock: "6rem",
    paddingInline: "1.5rem",
    backgroundColor: theme.colors.paper,
  },
  header: {
    maxWidth: "48rem",
    margin: "0 auto 3.5rem",
    textAlign: "center",
  },
  kicker: {
    fontFamily: theme.fonts.headline,
    fontSize: "0.6875rem",
    fontWeight: 800,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: theme.colors.everglade,
    margin: 0,
  },
  title: {
    margin: "1rem 0 0",
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1.15,
    color: theme.colors.everglade,
  },
  ratingRow: {
    marginTop: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
  },
  ratingMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  ratingValue: {
    fontFamily: theme.fonts.headline,
    fontSize: "1.125rem",
    fontWeight: 800,
    color: theme.colors.everglade,
  },
  ratingCount: {
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    color: theme.colors.legalMuted,
  },
  stars: {
    display: "flex",
    alignItems: "center",
    gap: "0.125rem",
  },
  star: {
    width: "1.25rem",
    height: "1.25rem",
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
} satisfies Record<string, CSSProperties>;

const RatingStars = () => (
  <div style={styles.stars} aria-hidden="true">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} viewBox="0 0 24 24" style={styles.star} fill="#FBBC05">
        <path d="M12 2l2.95 6.36 6.99.78-5.2 4.72 1.42 6.86L12 17.77l-6.16 3.95 1.42-6.86-5.2-4.72 6.99-.78L12 2z" />
      </svg>
    ))}
  </div>
);

const MARQUEE_ROW_SIZE = 12;

export const GoogleReviews = () => {
  const firstRow = reviews.slice(0, MARQUEE_ROW_SIZE);
  const secondRow = reviews.slice(MARQUEE_ROW_SIZE, MARQUEE_ROW_SIZE * 2);

  return (
    <section style={styles.section} aria-labelledby="reviews-heading">
      <div className={layoutClass.containerWide}>
        <div style={styles.header}>
          <p style={styles.kicker}>Trusted across Austin</p>
          <h2 id="reviews-heading" style={styles.title}>
            What homeowners say
          </h2>

          <div style={styles.ratingRow}>
            <GoogleLogo style={{ height: "1.75rem", width: "auto" }} />
            <div style={styles.ratingMeta}>
              <span style={styles.ratingValue}>5.0</span>
              <RatingStars />
              <span style={styles.ratingCount}>· {reviews.length} reviews shown</span>
            </div>
          </div>
        </div>

        <div style={styles.rows}>
          <MarqueeRow reviews={firstRow} />
          <MarqueeRow reviews={secondRow} reverse />
        </div>
      </div>
    </section>
  );
};
