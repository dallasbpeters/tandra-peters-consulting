import React from "react";

import type { TestimonialsProps } from "../types";

import { RichText } from "../portableText/RichText";
import { hasPortableTextContent } from "../portableText/value";
import { theme } from "../theme";
import { GoogleReviews } from "./reviews/google-reviews";
import { reviews } from "./reviews/reviews-data";

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Google reviews from synced Elfsight data (`src/data/reviews.ts`).
 */
export const Testimonials = ({ emptyStateNote }: TestimonialsProps) => {
  const useCmsEmptyState = hasPortableTextContent(emptyStateNote);

  if (reviews.length > 0) {
    return (
      <div id="testimonials" style={{ position: "relative" }}>
        <h2 style={srOnly}>Client reviews and testimonials</h2>
        <GoogleReviews />
      </div>
    );
  }

  return (
    <div
      id="testimonials"
      style={{
        width: "100%",
        minHeight: "min(36rem, 75vh)",
        paddingBlock: theme.spacing.xxxxxxl,
        paddingInline: theme.spacing.xxl,
        backgroundColor: theme.colors.everglade,
        position: "relative",
      }}
    >
      <h2 style={srOnly}>Client reviews and testimonials</h2>
      {useCmsEmptyState ? (
        <div
          style={{
            color: theme.colors.textOnBrand,
            textAlign: "center",
            maxWidth: "36rem",
            margin: `${theme.spacing.xxxxxxxxl} auto`,
            lineHeight: 1.6,
            fontSize: "0.95rem",
          }}
        >
          <RichText
            value={emptyStateNote}
            paragraphStyle={{
              color: "inherit",
              textAlign: "inherit",
              lineHeight: "inherit",
              fontSize: "inherit",
            }}
            linkStyle={{ color: theme.colors.accentLight }}
          />
        </div>
      ) : (
        <p
          style={{
            color: theme.colors.textOnBrand,
            textAlign: "center",
            maxWidth: "36rem",
            margin: `${theme.spacing.xxxxxxxxl} auto`,
            lineHeight: 1.6,
            fontSize: "0.95rem",
          }}
        >
          Reviews will appear here once review data is synced.
        </p>
      )}
    </div>
  );
};

/** @deprecated Use `Testimonials`; kept so existing imports keep working. */
export const WallyReviews = Testimonials;
