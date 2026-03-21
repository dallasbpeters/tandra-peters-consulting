import { useEffect, useRef } from "react";
import { theme } from "../theme";

const WALLY_WIDGET_ID =
  import.meta.env.VITE_WALLY_WIDGET_ID ?? "68aa2f19f1562900147a131c";

/**
 * Loads Wally’s public embed. The `wally-reviews` npm package injects
 * `embed.js?app=true`, which points the iframe at `/design` and does not
 * render on external sites — use the script URL without `app`.
 *
 * A cache-busted script URL runs the embed’s scanner on each mount so React
 * Strict Mode / SPA remounts still initialize widgets after the first load.
 */
const WallyReviews = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const root = document.createElement("div");
    root.setAttribute("data-wally-widget", WALLY_WIDGET_ID);
    root.style.display = "block";
    root.style.width = "100%";
    root.style.minHeight = "min(32rem, 70vh)";
    container.appendChild(root);

    const script = document.createElement("script");
    script.defer = true;
    script.src = `https://embed.getwally.net/embed.js?_=${Date.now()}`;
    document.head.appendChild(script);

    return () => {
      root.remove();
      script.remove();
    };
  }, []);

  return (
    <div
    id="testimonials"
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: "min(32rem, 70vh)",
        paddingBlock: "2rem",
        backgroundColor: theme.colors.everglade,
      }}
    />
  );
};

export { WallyReviews };
