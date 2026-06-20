import { useIsMobile } from "../hooks/is-mobile";
import { theme } from "../theme";

const DEFAULT_EMBED_URL =
  "https://player.vimeo.com/video/834503838?h=f049c62156";

const VIMEO_URL_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;

const toVimeoEmbedUrl = (rawUrl?: string): string => {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return DEFAULT_EMBED_URL;
  }

  const trimmed = rawUrl.trim();

  if (trimmed.includes("player.vimeo.com/video/")) {
    return trimmed;
  }

  const match = trimmed.match(VIMEO_URL_RE);
  if (match?.[1]) {
    return `https://player.vimeo.com/video/${match[1]}`;
  }

  return DEFAULT_EMBED_URL;
};

interface BirdcreekVideoBannerProps {
  title?: string;
  vimeoUrl?: string;
}

export const BirdcreekVideoBanner = ({
  vimeoUrl,
  title,
}: BirdcreekVideoBannerProps) => {
  const embedUrl = toVimeoEmbedUrl(vimeoUrl);

  const isMobile = useIsMobile(1100);
  // Drive the entrance with useInView (not whileInView): on first render inView is
  // false so `initial` paints, then the observer flips it true on the next tick and
  // Motion actually tweens — reliable even when the banner is in view on load
  // (whileInView can snap straight to the end state before `initial` paints).

  const containerStyle: React.CSSProperties = {
    background: theme.colors.everglade,
    display: "grid",
    gap: theme.spacing.xxxxl,
    overflow: "hidden",
    padding: `${theme.spacing.xxxxl}`,
    placeContent: "center",
    placeItems: "stretch",
    position: "relative",
  };

  const iframeStyle: React.CSSProperties = {
    aspectRatio: isMobile ? "20/9" : "20/6",
    borderRadius: theme.radius.large,
    height: "auto",
    maxWidth: "1200px",
    minWidth: isMobile ? "98vw" : "96vw",
    width: "fit-content",
  };

  const titleStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
    fontWeight: 700,
    lineHeight: 1.2,
    margin: 0,
    textAlign: "center",
  };

  return (
    <div
      style={{
        ...containerStyle,
        padding: isMobile ? `${theme.spacing.xxxxl}` : containerStyle.padding,
      }}
    >
      {typeof title === "string" && title.trim() ? (
        <h2 style={titleStyle}>{title}</h2>
      ) : null}
      <iframe
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        src={embedUrl}
        style={iframeStyle}
        title="vimeo-player"
      />
    </div>
  );
};
