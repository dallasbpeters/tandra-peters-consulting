import { theme } from "../theme";

/**
 * Google reviews from synced Elfsight data (`src/data/reviews.ts`).
 */
export const Testimonials = () => {
  return (
    <div
      id="testimonials"
      style={{
        width: "100%",
        paddingBlock: theme.spacing.xxxxxxl,
        paddingInline: theme.spacing.xxl,
        backgroundColor: theme.colors.paper,
        position: "relative",
      }}
    >
      <div
        className="elfsight-app-942cf3c9-7b21-4e39-92a1-8c5a2aef07b5"
        data-elfsight-app-lazy
      ></div>
      <script src="https://elfsightcdn.com/platform.js" async />
    </div>
  );
};

/** @deprecated Use `Testimonials`; kept so existing imports keep working. */
export const WallyReviews = Testimonials;
