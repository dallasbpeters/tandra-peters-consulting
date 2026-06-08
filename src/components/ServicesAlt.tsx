import { usePostHog } from "@posthog/react";
import { Page, Search, ShieldCheck } from "iconoir-react";
import { motion } from "motion/react";
import React from "react";

import type { BirdcreekAdvantageCard, RichTextSource, ServicesProps } from "../types";

import { useIsMobile } from "../hooks/isMobile";
import { RichText } from "../portableText/RichText";
import { theme } from "../theme";

const PHASE_SUFFIX: Record<string, string> = {
  "01": "INSP",
  "02": "CLM",
  "03": "EXEC",
};

const DEFAULT_BASE_MASK_IMAGE = "/roof-2.jpg";
const DEFAULT_OVERLAY_MASK_IMAGE = "/metal-roof.jpg";

const defaultServices: NonNullable<ServicesProps["services"]> = [
  {
    id: "01",
    title: "Comprehensive Roof Assessment",
    description:
      "On-site and photo-based review of your roof system: decking, flashing, ventilation, and drainage—documented so you understand what is urgent, what can wait, and what to discuss with insurers or contractors.",
    icon: Search,
    image: "/roof-2.jpg",
  },
  {
    id: "02",
    title: "Insurance Claim Advocacy",
    description:
      "Help organizing claim paperwork, interpreting adjuster estimates, and advocating for scopes that match real damage—so you are not left under-covered on a major asset.",
    icon: Page,
  },
  {
    id: "03",
    title: "Project Oversight",
    description:
      "Site visits, quality checkpoints, and clear communication from tear-off through final walkthrough, aligned with Birdcreek Roofing crews so the roof you approved is the roof you receive.",
    icon: ShieldCheck,
  },
];

const defaultBirdcreekAdvantage: NonNullable<ServicesProps["birdcreekAdvantage"]> = {
  title: "The Birdcreek Advantage",
  description:
    "Direct access to Austin's premier roofing company, combining Tandra's consultation with Birdcreek's legendary execution.",
  ctaLabel: "Learn More",
  ctaHref: "https://birdcreekroofing.com",
};

type ServiceDisplayItem = {
  key: string;
  phase: string;
  title: string;
  description: RichTextSource;
};

const formatPhaseLabel = (id: string, index: number): string => {
  const normalizedId = id.padStart(2, "0");
  const suffix = PHASE_SUFFIX[id] ?? PHASE_SUFFIX[normalizedId] ?? `SVC${index + 1}`;
  return `PHASE ${normalizedId} // ${suffix}`;
};

const buildDisplayItems = (
  services: NonNullable<ServicesProps["services"]>,
): ServiceDisplayItem[] =>
  services.map((service, index) => ({
    key: service.id,
    phase: formatPhaseLabel(service.id, index),
    title: service.title,
    description: service.description,
  }));

const MassiveType = () => (
  <div className="services-alt-massive-type services-alt-massive-type--masked">
    <div>BIRD</div>
    <div>CREEK</div>
    <div>ROOF</div>
    <div>ING.</div>
  </div>
);

type ArtContainerProps = {
  baseImage: string;
  overlayImage: string;
};

const ArtContainer = ({ baseImage, overlayImage }: ArtContainerProps) => (
  <div
    className="services-alt-art"
    aria-hidden="true"
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

type BrandBadgeProps = {
  isMobile: boolean;
};

const BrandBadge = ({ isMobile }: BrandBadgeProps) => {
  const style: React.CSSProperties = {
    position: isMobile ? "relative" : "absolute",
    bottom: isMobile ? undefined : "8vw",
    left: isMobile ? undefined : "4vw",
    alignSelf: isMobile ? "flex-start" : undefined,
    marginBottom: isMobile ? theme.spacing.xl : undefined,
    backgroundColor: theme.colors.everglade,
    color: theme.colors.paper,
    padding: "0.4rem 1.2rem 0.3rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    fontSize: "1.2rem",
    letterSpacing: "-0.02em",
    textTransform: "uppercase",
    display: "inline-block",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
  };

  return <div style={style}>Birdcreek Roofing</div>;
};

type ServiceItemProps = {
  phase: string;
  title: string;
  description: RichTextSource;
  isMobile: boolean;
};

const ServiceItem = ({ phase, title, description, isMobile }: ServiceItemProps) => {
  const itemStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    textAlign: isMobile ? "left" : "right",
    alignItems: isMobile ? "flex-start" : "flex-end",
  };

  const metaStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontSize: "0.65rem",
    color: theme.colors.paper,
    marginBottom: "0.25rem",
    letterSpacing: "0.1em",
    opacity: 0.9,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: theme.typography.size200,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
    lineHeight: 1.1,
    maxWidth: isMobile ? "100%" : "90%",
    color: theme.colors.paper,
  };

  const descStyle: React.CSSProperties = {
    fontSize: theme.typography.size100,
    lineHeight: 1.45,
    fontWeight: 500,
    color: theme.colors.paper,
    maxWidth: "100%",
    opacity: 0.95,
  };

  const richParagraphStyle: React.CSSProperties = {
    color: "inherit",
    lineHeight: "inherit",
    fontSize: "inherit",
    margin: 0,
  };

  return (
    <article style={itemStyle}>
      <div style={metaStyle}>{phase}</div>
      <h2 style={titleStyle}>{title}</h2>
      <div style={descStyle}>
        <RichText value={description} paragraphStyle={richParagraphStyle} />
      </div>
    </article>
  );
};

type BirdcreekAdvantageItemProps = {
  birdcreekAdvantage: BirdcreekAdvantageCard;
  isMobile: boolean;
  onCtaClick: () => void;
};

const BirdcreekAdvantageItem = ({
  birdcreekAdvantage,
  isMobile,
  onCtaClick,
}: BirdcreekAdvantageItemProps) => {
  const itemStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    textAlign: isMobile ? "left" : "right",
    alignItems: isMobile ? "flex-start" : "flex-end",
  };

  const metaStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontSize: theme.typography.size100,
    color: theme.colors.paper,
    marginBottom: "0.25rem",
    letterSpacing: "0.1em",
    opacity: 0.9,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: theme.typography.size200,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
    lineHeight: 1.1,
    maxWidth: isMobile ? "100%" : "90%",
    color: theme.colors.paper,
  };

  const descStyle: React.CSSProperties = {
    fontSize: theme.typography.size100,
    lineHeight: 1.45,
    fontWeight: 500,
    color: theme.colors.paper,
    maxWidth: "100%",
    opacity: 0.95,
  };

  const ctaStyle: React.CSSProperties = {
    backgroundColor: theme.colors.heroAccent,
    color: theme.colors.everglade,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "0.65rem",
    border: "none",
    cursor: "pointer",
    borderRadius: theme.radius.large,
    textDecoration: "none",
    display: "inline-block",
    marginTop: "0.75rem",
  };

  const richParagraphStyle: React.CSSProperties = {
    color: "inherit",
    lineHeight: "inherit",
    fontSize: "inherit",
    margin: 0,
  };

  return (
    <article style={itemStyle}>
      <div style={metaStyle}>CORE // ADV</div>
      <h2 style={titleStyle}>{birdcreekAdvantage.title}</h2>
      <div style={descStyle}>
        <RichText value={birdcreekAdvantage.description} paragraphStyle={richParagraphStyle} />
      </div>
      <motion.a
        tabIndex={1}
        href={birdcreekAdvantage.ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        onTap={onCtaClick}
        style={ctaStyle}
        whileHover={{ scale: 1.05, backgroundColor: theme.colors.accent }}
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
  const baseMaskImage = typographicArt?.baseMaskImage ?? DEFAULT_BASE_MASK_IMAGE;
  const overlayMaskImage = typographicArt?.overlayMaskImage ?? DEFAULT_OVERLAY_MASK_IMAGE;

  const handleBirdcreekClick = () => {
    posthog?.capture("birdcreek_link_clicked", {
      cta_label: birdcreekAdvantage.ctaLabel,
      cta_href: birdcreekAdvantage.ctaHref,
      services_variant: "typographic-alt",
    });
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.palette.everglade[900],
    color: theme.colors.paper,
    fontFamily: theme.fonts.body,
    overflow: "hidden",
    minHeight: isMobile ? undefined : "100vh",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    position: "relative",
    boxSizing: "border-box",
    width: isMobile ? "100%" : `calc(100% - 2 * ${theme.spacing.lg})`,
    margin: isMobile ? 0 : theme.spacing.lg,
    borderRadius: isMobile ? 0 : theme.radius.large,
  };

  const uiLayerStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 10,
    minHeight: isMobile ? undefined : "100vh",
    padding: isMobile ? theme.spacing.xl : "4vw",
    display: "flex",
    flexDirection: "column",
    justifyContent: isMobile ? "flex-start" : "space-between",
    alignItems: isMobile ? "flex-start" : "stretch",
  };

  const clusterStyle: React.CSSProperties = {
    alignSelf: isMobile ? "stretch" : "flex-end",
    width: isMobile ? "100%" : undefined,
    maxWidth: isMobile ? "none" : "450px",
    marginTop: isMobile ? theme.spacing.xl : "auto",
    marginBottom: isMobile ? 0 : "4vh",
    display: "flex",
    flexDirection: "column",
    alignItems: isMobile ? "flex-start" : "flex-end",
    gap: isMobile ? theme.spacing.xl : "3rem",
  };

  return (
    <section id="services" style={sectionStyle} aria-label="Services">
      {!isMobile && <ArtContainer baseImage={baseMaskImage} overlayImage={overlayMaskImage} />}
      <div style={uiLayerStyle}>
        <BrandBadge isMobile={isMobile} />
        <div style={clusterStyle}>
          {displayItems.map((service) => (
            <ServiceItem
              key={service.key}
              phase={service.phase}
              title={service.title}
              description={service.description}
              isMobile={isMobile}
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
