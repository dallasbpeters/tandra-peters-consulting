import { useEffect, useRef } from "react";

import { useNearViewport } from "../hooks/useNearViewport";
import { theme } from "../theme";

const ELFSIGHT_SCRIPT_ID = "elfsight-platform";
const ELFSIGHT_SCRIPT_SRC = "https://elfsightcdn.com/platform.js";

const loadElfsightPlatform = () => {
  if (document.getElementById(ELFSIGHT_SCRIPT_ID)) {
    return;
  }
  const script = document.createElement("script");
  script.id = ELFSIGHT_SCRIPT_ID;
  script.src = ELFSIGHT_SCRIPT_SRC;
  script.async = true;
  document.body.appendChild(script);
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
      ref={sectionRef}
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
    </div>
  );
};

/** @deprecated Use `Testimonials`; kept so existing imports keep working. */
export const WallyReviews = Testimonials;
