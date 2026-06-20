import type { CSSProperties } from "react";

import { theme } from "../../theme";
import { ReviewCard } from "./review-card";
import type { Review } from "./reviews-data";

const styles = {
  viewport: {
    display: "flex",
    overflow: "hidden",
  },
  track: {
    display: "flex",
    flexShrink: 0,
    gap: theme.spacing.xl,
    paddingRight: theme.spacing.xl,
  },
} satisfies Record<string, CSSProperties>;

export function MarqueeRow({
  reviews,
  reverse = false,
}: {
  reviews: Review[];
  reverse?: boolean;
}) {
  return (
    <div className="marquee-row" style={styles.viewport}>
      <div
        className={`marquee-track${reverse ? "marquee-track--reverse" : ""}`}
        style={styles.track}
      >
        {reviews.map((review) => (
          <ReviewCard key={`a-${review.id}`} review={review} />
        ))}
        {reviews.map((review) => (
          <ReviewCard key={`b-${review.id}`} review={review} />
        ))}
      </div>
    </div>
  );
}
