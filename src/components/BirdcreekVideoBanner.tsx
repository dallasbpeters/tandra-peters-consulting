import { useIsMobile } from "../hooks/isMobile";
import { theme } from "../theme";

export const BirdcreekVideoBanner = () => {
  const embedUrl = `https://player.vimeo.com/video/834503838?h=f049c62156`;

  const isMobile = useIsMobile(1100);
  // Drive the entrance with useInView (not whileInView): on first render inView is
  // false so `initial` paints, then the observer flips it true on the next tick and
  // Motion actually tweens — reliable even when the banner is in view on load
  // (whileInView can snap straight to the end state before `initial` paints).

  const containerStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    placeContent: "center",
    placeItems: "stretch",
    background: theme.colors.everglade,
    padding: `${theme.spacing.xxxxl}`,
    gap: theme.spacing.xxxxl,
  };

  const iframeStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    minWidth: "96vw",
    maxWidth: "1200px",
    aspectRatio: isMobile ? "20/9" : "20/6",
  };

  return (
    <div
      style={{
        ...containerStyle,
        padding: isMobile ? `${theme.spacing.xxxxl}` : containerStyle.padding,
      }}
    >
      <iframe
        title="vimeo-player"
        src={embedUrl}
        style={iframeStyle}
        height="640"
        width="360"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
};
