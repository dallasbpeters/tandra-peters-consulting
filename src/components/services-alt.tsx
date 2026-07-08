import { usePostHog } from "@posthog/react";
import { Page, Search, ShieldCheck } from "iconoir-react";
import { motion } from "motion/react";
import type React from "react";

import { useIsMobile } from "../hooks/is-mobile";
import { RichText } from "../portableText/rich-text";
import { theme } from "../theme";
import type {
  BirdcreekAdvantageCard,
  RichTextSource,
  ServicesProps,
} from "../types";

const PHASE_SUFFIX: Record<string, string> = {
  "01": "INSP",
  "02": "CLM",
  "03": "EXEC",
};

const DEFAULT_BASE_MASK_IMAGE = "/roof-2.jpg";
const DEFAULT_OVERLAY_MASK_IMAGE = "/metal-roof.jpg";

const defaultServices: NonNullable<ServicesProps["services"]> = [
  {
    description:
      "On-site and photo-based review of your roof system: decking, flashing, ventilation, and drainage—documented so you understand what is urgent, what can wait, and what to discuss with insurers or contractors.",
    icon: Search,
    id: "01",
    image: "/roof-2.jpg",
    title: "Comprehensive Roof Assessment",
  },
  {
    description:
      "Help organizing claim paperwork, interpreting adjuster estimates, and advocating for scopes that match real damage—so you are not left under-covered on a major asset.",
    icon: Page,
    id: "02",
    title: "Insurance Claim Advocacy",
  },
  {
    description:
      "Site visits, quality checkpoints, and clear communication from tear-off through final walkthrough, aligned with Birdcreek Roofing crews so the roof you approved is the roof you receive.",
    icon: ShieldCheck,
    id: "03",
    title: "Project Oversight",
  },
];

const defaultBirdcreekAdvantage: NonNullable<
  ServicesProps["birdcreekAdvantage"]
> = {
  ctaHref: "https://birdcreekroofing.com",
  ctaLabel: "Learn More",
  description:
    "Direct access to Austin's premier roofing company, combining Tandra's consultation with Birdcreek's legendary execution.",
  title: "The Birdcreek Advantage",
};

interface ServiceDisplayItem {
  description: RichTextSource;
  key: string;
  phase: string;
  title: string;
}

const formatPhaseLabel = (id: string, index: number): string => {
  const normalizedId = id.padStart(2, "0");
  const suffix =
    PHASE_SUFFIX[id] ?? PHASE_SUFFIX[normalizedId] ?? `SVC${index + 1}`;
  return `PHASE ${normalizedId} // ${suffix}`;
};

const buildDisplayItems = (
  services: NonNullable<ServicesProps["services"]>
): ServiceDisplayItem[] =>
  services.map((service, index) => ({
    description: service.description,
    key: service.id,
    phase: formatPhaseLabel(service.id, index),
    title: service.title,
  }));

const MassiveType = () => (
  <div className="services-alt-massive-type services-alt-massive-type--masked">
    <div>BIRD</div>
    <div>CREEK</div>
    <div>ROOF</div>
    <div>ING.</div>
  </div>
);

interface ArtContainerProps {
  baseImage: string;
  overlayImage: string;
}

const ArtContainer = ({ baseImage, overlayImage }: ArtContainerProps) => (
  <div
    aria-hidden="true"
    className="services-alt-art"
    style={
      {
        "--services-alt-mask-image-base": `url("${baseImage}")`,
        "--services-alt-mask-image-overlay": `url("${overlayImage}")`,
      } as React.CSSProperties
    }
  >
    <div className="services-alt-massive-type-layer services-alt-massive-type-layer--base">
      <MassiveType />
    </div>
    <div className="services-alt-massive-type-layer services-alt-massive-type-layer--overlay">
      <MassiveType />
    </div>
  </div>
);

interface BrandBadgeProps {
  isMobile: boolean;
}

const BrandBadge = ({ isMobile }: BrandBadgeProps) => {
  const style: React.CSSProperties = {
    alignSelf: isMobile ? "flex-start" : undefined,
    backgroundColor: theme.colors.everglade,
    bottom: isMobile ? undefined : "8vw",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
    color: theme.colors.paper,
    display: "inline-block",
    fontFamily: theme.fonts.headline,
    fontSize: "1.2rem",
    fontWeight: 900,
    left: isMobile ? undefined : "4vw",
    letterSpacing: "-0.02em",
    marginBottom: isMobile ? theme.spacing.xl : undefined,
    padding: "0.4rem 1.2rem 0.3rem",
    position: isMobile ? "relative" : "absolute",
    textTransform: "uppercase",
  };

  return <div style={style}>Birdcreek Roofing</div>;
};

interface ServiceItemProps {
  description: RichTextSource;
  isMobile: boolean;
  phase: string;
  title: string;
}

const ServiceItem = ({
  phase,
  title,
  description,
  isMobile,
}: ServiceItemProps) => {
  const itemStyle: React.CSSProperties = {
    textAlign: isMobile ? "left" : "right",
  };

  const metaStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontFamily: theme.fonts.body,
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    marginBottom: "0.25rem",
    opacity: 0.9,
  };

  const titleStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontSize: theme.typography.size200,
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: theme.spacing.md,
    maxWidth: isMobile ? "100%" : "90%",
    textTransform: "uppercase",
  };

  const descStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontSize: theme.typography.size100,
    fontWeight: 500,
    lineHeight: 1.45,
    maxWidth: "100%",
    opacity: 0.95,
  };

  const richParagraphStyle: React.CSSProperties = {
    color: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    margin: 0,
  };

  return (
    <article className="services-alt-item" style={itemStyle}>
      <div style={metaStyle}>{phase}</div>
      <h2 style={titleStyle}>{title}</h2>
      <div style={descStyle}>
        <RichText paragraphStyle={richParagraphStyle} value={description} />
      </div>
    </article>
  );
};

interface BirdcreekAdvantageItemProps {
  birdcreekAdvantage: BirdcreekAdvantageCard;
  isMobile: boolean;
  onCtaClick: () => void;
}

const BirdcreekAdvantageItem = ({
  birdcreekAdvantage,
  isMobile,
  onCtaClick,
}: BirdcreekAdvantageItemProps) => {
  const itemStyle: React.CSSProperties = {
    textAlign: isMobile ? "left" : "right",
  };

  const metaStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontFamily: theme.fonts.body,
    fontSize: theme.typography.size100,
    letterSpacing: "0.1em",
    marginBottom: "0.25rem",
    opacity: 0.9,
  };

  const titleStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontSize: theme.typography.size200,
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: theme.spacing.md,
    maxWidth: isMobile ? "100%" : "90%",
    textTransform: "uppercase",
  };

  const descStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontSize: theme.typography.size100,
    fontWeight: 500,
    lineHeight: 1.45,
    maxWidth: "100%",
    opacity: 0.95,
  };

  const ctaStyle: React.CSSProperties = {
    backgroundColor: theme.colors.heroAccent,
    border: "none",
    borderRadius: theme.radius.large,
    color: theme.colors.everglade,
    cursor: "pointer",
    display: "inline-block",
    fontFamily: theme.fonts.headline,
    fontSize: "0.65rem",
    fontWeight: 900,
    letterSpacing: "0.1em",
    marginTop: "0.75rem",
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    textDecoration: "none",
    textTransform: "uppercase",
  };

  const richParagraphStyle: React.CSSProperties = {
    color: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    margin: 0,
  };

  return (
    <article className="services-alt-item" style={itemStyle}>
      <div style={metaStyle}>CORE // ADV</div>
      <h2 style={titleStyle}>{birdcreekAdvantage.title}</h2>
      <div style={descStyle}>
        <RichText
          paragraphStyle={richParagraphStyle}
          value={birdcreekAdvantage.description}
        />
      </div>
      <motion.a
        href={birdcreekAdvantage.ctaHref}
        onTap={onCtaClick}
        rel="noopener noreferrer"
        style={ctaStyle}
        tabIndex={0}
        target="_blank"
        whileHover={{ backgroundColor: theme.colors.accent, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {birdcreekAdvantage.ctaLabel}
      </motion.a>
    </article>
  );
};

export const ServicesAlt: React.FC<ServicesProps> = ({
  services = defaultServices,
  birdcreekAdvantage = defaultBirdcreekAdvantage,
  typographicArt,
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile();
  const displayItems = buildDisplayItems(services);
  const baseMaskImage =
    typographicArt?.baseMaskImage ?? DEFAULT_BASE_MASK_IMAGE;
  const overlayMaskImage =
    typographicArt?.overlayMaskImage ?? DEFAULT_OVERLAY_MASK_IMAGE;

  const handleBirdcreekClick = () => {
    posthog?.capture("birdcreek_link_clicked", {
      cta_href: birdcreekAdvantage.ctaHref,
      cta_label: birdcreekAdvantage.ctaLabel,
      services_variant: "typographic-alt",
    });
  };

  const sectionStyle: React.CSSProperties = {
    MozOsxFontSmoothing: "grayscale",
    WebkitFontSmoothing: "antialiased",
    backgroundColor: theme.palette.everglade[900],
    borderRadius: isMobile ? 0 : theme.radius.large,
    boxSizing: "border-box",
    color: theme.colors.paper,
    fontFamily: theme.fonts.body,
    margin: isMobile ? 0 : theme.spacing.lg,
    minHeight: isMobile ? undefined : "100vh",
    overflow: "hidden",
    position: "relative",
    width: isMobile ? "100%" : `calc(100% - 2 * ${theme.spacing.lg})`,
  };

  const uiLayerStyle: React.CSSProperties = {
    alignItems: isMobile ? "flex-start" : "stretch",
    display: "flex",
    flexDirection: "column",
    justifyContent: isMobile ? "flex-start" : "space-between",
    minHeight: isMobile ? undefined : "100vh",
    padding: isMobile ? theme.spacing.xl : "4vw",
    position: "relative",
    zIndex: 10,
  };

  const clusterStyle: React.CSSProperties = {
    alignItems: isMobile ? "flex-start" : "flex-end",
    alignSelf: isMobile ? "stretch" : "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? theme.spacing.xl : "3rem",
    marginBottom: isMobile ? 0 : "4vh",
    marginTop: isMobile ? theme.spacing.xl : "auto",
    maxWidth: isMobile ? "none" : "450px",
    width: isMobile ? "100%" : undefined,
  };

  return (
    <section aria-label="services" id="services" style={sectionStyle}>
      {!isMobile && (
        <ArtContainer
          baseImage={baseMaskImage}
          overlayImage={overlayMaskImage}
        />
      )}
      <div style={uiLayerStyle}>
        <BrandBadge isMobile={isMobile} />
        <div style={clusterStyle}>
          {displayItems.map((service) => (
            <ServiceItem
              description={service.description}
              isMobile={isMobile}
              key={service.key}
              phase={service.phase}
              title={service.title}
            />
          ))}
          <BirdcreekAdvantageItem
            birdcreekAdvantage={birdcreekAdvantage}
            isMobile={isMobile}
            onCtaClick={handleBirdcreekClick}
          />
        </div>
      </div>
    </section>
  );
};

export default ServicesAlt;
