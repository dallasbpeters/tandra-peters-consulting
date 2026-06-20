import { useEffect, useRef } from "react";

import { useNearViewport } from "../hooks/use-near-viewport";
import { theme } from "../theme";

const ELFSIGHT_SCRIPT_ID = "elfsight-platform";
const ELFSIGHT_SCRIPT_SRC = "https://elfsightcdn.com/platform.js";

const loadElfsightPlatform = () => {
  if (document.querySelector(`#${ELFSIGHT_SCRIPT_ID}`)) {
    return;
  }
  const script = document.createElement("script");
  script.id = ELFSIGHT_SCRIPT_ID;
  script.src = ELFSIGHT_SCRIPT_SRC;
  script.async = true;
  document.body.append(script);
};

/**
 * Google reviews from synced Elfsight data (`src/data/reviews.ts`).
 */
export const Testimonials = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useNearViewport(sectionRef, "700px 0px");

  useEffect(() => {
    if (isNearViewport) {
      loadElfsightPlatform();
    }
  }, [isNearViewport]);

  return (
    <div
      id="testimonials"
      ref={sectionRef}
      style={{
        backgroundColor: theme.colors.paper,
        paddingBlock: theme.spacing.xxxxxxl,
        paddingInline: theme.spacing.xxl,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        className="elfsight-app-942cf3c9-7b21-4e39-92a1-8c5a2aef07b5"
        data-elfsight-app-lazy
      />
    </div>
  );
};

/** @deprecated Use `Testimonials`; kept so existing imports keep working. */
export const WallyReviews = Testimonials;
