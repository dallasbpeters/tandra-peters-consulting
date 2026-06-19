import { usePostHog } from "@posthog/react";
import { ArrowDownRight, Page, Search, ShieldCheck } from "iconoir-react";
import { motion } from "motion/react";
import type React from "react";

import { useIsMobile } from "../hooks/isMobile";
import { RichText } from "../portableText/RichText";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import type { ServicesProps } from "../types";
import BirdcreekLogo from "./BirdCreekLogo";

export const Services: React.FC<ServicesProps> = ({
  tagline = "Roofing consulting services",
  title = (
    <>
      Consultation.
      <br />
      Precision.
      <br />
      Execution.
    </>
  ),
  description = "From detailed roof inspections and documentation to insurance claim advocacy and on-site project oversight, you get a Birdcreek Roofing consultant who speaks both homeowner and crew—so education, advocacy, and installation stay under one trusted roof.",
  services = [
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
  ],
  birdcreekAdvantage = {
    title: "The Birdcreek Advantage",
    description:
      "Direct access to Austin's premier roofing company, combining Tandra's consultation with Birdcreek's legendary execution.",
    ctaLabel: "Learn More",
    ctaHref: "https://birdcreekroofing.com",
  },
}) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: "2rem",
  };

  const mainCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.medium,
    padding: "2rem",
    position: "relative",
    overflow: "hidden",
    minHeight: "500px",
    transition: "all 0.5s",
  };

  const secondaryCardStyle: React.CSSProperties = {
    backgroundColor: mix(theme.colors.everglade, 60),
    borderRadius: theme.radius.medium,
    padding: "2rem",
    border: `1px solid ${mix(theme.colors.paperDark, 10)}`,
    transition: "all 0.5s",
  };

  return (
    <section
      aria-labelledby="services-heading"
      className={layoutClass.sectionPadded}
      id="services"
      style={sectionStyle}
    >
      <div className={layoutClass.containerWide}>
        <motion.div
          className="layout-col-between wa-align-items-start wa-gap-2xl md-row-end"
          initial={{ opacity: 0, y: 20 }}
          style={headerStyle}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <style>{`
            .services-grid { display: grid; grid-template-columns: 1fr; gap: var(--wa-space-s); }
            @media (min-width: 768px) {
              .md-row-end {
                flex-direction: row !important;
                align-items: flex-end !important;
              }
              .services-grid {
                grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
              }
              .services-span-8 { grid-column: span 8 !important; }
              .services-span-4 { grid-column: span 4 !important; }
            }
          `}</style>
          <div style={{ maxWidth: "42rem" }}>
            <span
              style={{
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: `contrast-color(${theme.colors.black})`,
                fontSize: "0.75rem",
                marginBottom: "1.5rem",
                display: "block",
              }}
            >
              {tagline}
            </span>
            <h2
              id="services-heading"
              style={{
                fontSize: "clamp(3rem, 10vw, 6rem)",
                lineHeight: 1,
                fontFamily: theme.fonts.headline,
                fontWeight: 800,
                color: `contrast-color(${theme.colors.black})`,
              }}
            >
              {title}
            </h2>
          </div>
          <div
            style={{
              maxWidth: "24rem",
              color: `contrast-color(${theme.colors.black})`,
              lineHeight: 1.6,
              fontSize: "1.1rem",
            }}
          >
            <RichText
              paragraphStyle={{
                color: "inherit",
                lineHeight: "inherit",
                fontSize: "inherit",
              }}
              value={description}
            />
          </div>
        </motion.div>

        <motion.div
          className="services-grid"
          initial="hidden"
          variants={containerVariants}
          viewport={{ once: true, margin: "-100px" }}
          whileInView="visible"
        >
          {
            // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
            services.map((service, i) => {
              const isMain = i === 0;
              return (
                <motion.div
                  className={`${isMain ? "services-span-8" : "services-span-4"} group layout-col-between`}
                  key={service.id}
                  style={isMain ? mainCardStyle : secondaryCardStyle}
                  variants={cardVariants}
                >
                  {isMain && service.image && (
                    <div
                      className="group-hover-opacity"
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0.2,
                        transition: "opacity 0.7s",
                      }}
                    >
                      <style>{`
                      .group:hover .group-hover-opacity { opacity: 0.3 !important; }
                      .group:hover .group-hover-scale { transform: scale(1.1) !important; }
                      .group:hover .group-hover-rotate { transform: rotate(45deg) !important; }
                    `}</style>
                      {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
                      <img
                        alt={service.title}
                        referrerPolicy="no-referrer"
                        src={service.image}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ position: "relative", zIndex: 10 }}>
                    <div
                      className={
                        isMain ? "group-hover-scale" : "group-hover-bg-accent"
                      }
                      style={{
                        width: isMain ? "4rem" : "3rem",
                        height: isMain ? "4rem" : "3rem",
                        backgroundColor: isMain
                          ? theme.colors.accentLight
                          : theme.palette.coral["400"],
                        borderRadius: theme.radius.pill,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "2.5rem",
                        transition: "all 0.5s",
                      }}
                    >
                      {!isMain && (
                        <style>{`
                        .group:hover .group-hover-bg-accent { background-color: ${theme.colors.accentLight} !important; }
                        .group:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 11px 11px -5px rgba(0, 0, 0, 0.04) !important; }
                      `}</style>
                      )}
                      <service.icon
                        height={isMain ? 36 : 28}
                        style={{ color: theme.colors.white }}
                        width={isMain ? 36 : 28}
                      />
                    </div>
                    <h3
                      style={{
                        color: theme.colors.white,
                        fontSize: isMain
                          ? "clamp(2rem, 5vw, 3.75rem)"
                          : "1.875rem",
                        lineHeight: isMain ? 1 : 1.25,
                        marginBottom: "1.5rem",
                        fontFamily: theme.fonts.headline,
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      {service.title}
                    </h3>
                    <div
                      style={{
                        color: theme.colors.white,
                        maxWidth: isMain ? "28rem" : "none",
                        lineHeight: 1.6,
                        fontSize: isMain ? "1rem" : "1.1rem",
                      }}
                    >
                      <RichText
                        flow="heading"
                        linkStyle={{
                          color: isMain
                            ? theme.colors.accentLight
                            : theme.colors.accent,
                        }}
                        paragraphStyle={{
                          color: "inherit",
                          lineHeight: "inherit",
                          fontSize: "inherit",
                        }}
                        value={service.description}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      zIndex: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        color: `contrast-color(${theme.colors.black})`,
                        fontFamily: theme.fonts.headline,
                        fontWeight: 900,
                        fontSize: isMain ? "6rem" : "3.75rem",
                        lineHeight: 1,
                      }}
                    >
                      {service.id}
                    </span>
                    <button
                      aria-label={`Go to contact — ${service.title}`}
                      className={isMain ? "group-hover-rotate" : ""}
                      onClick={() => {
                        posthog?.capture("service_cta_clicked", {
                          service_title: service.title,
                          service_id: service.id,
                        });
                        window.location.href = "#contact";
                      }}
                      onMouseEnter={(e) => {
                        if (!isMain) {
                          e.currentTarget.style.color = theme.colors.everglade;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMain) {
                          e.currentTarget.style.color = "rgba(0, 26, 16, 0.4)";
                        }
                      }}
                      style={{
                        backgroundColor: isMain
                          ? "rgba(255, 255, 255, 0.1)"
                          : "transparent",
                        color: isMain
                          ? theme.colors.white
                          : "rgba(0, 26, 16, 0.4)",
                        padding: isMain ? "1.5rem" : "0",
                        borderRadius: theme.radius.pill,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                      type="button"
                    >
                      <ArrowDownRight
                        aria-hidden
                        height={isMain ? 32 : 24}
                        strokeWidth={2.2}
                        width={isMain ? 32 : 24}
                      />
                    </button>
                  </div>
                </motion.div>
              );
            })
          }

          <motion.div
            className="services-span-8 group-advantage"
            style={{
              backgroundColor: theme.palette.gold["100"],
              borderRadius: theme.radius.medium,
              padding: isMobile ? "2rem" : "3rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "start",
              justifyContent: "space-between",
              gap: "1rem",
              transition: "all 0.7s",
            }}
            variants={cardVariants}
          >
            <style>{`
              .group-advantage:hover { background-color: ${theme.colors.everglade} !important; }
              .group-advantage:hover h3 { color: white !important; }
              .group-advantage:hover p { color: ${theme.colors.textOnBrand} !important; }
              .group-advantage:hover .group-advantage-cta {
                background-color: ${theme.colors.purple} !important;
                color: ${theme.colors.everglade} !important;
              }
              .group-advantage:hover .group-advantage-cta:hover {
                background-color: ${theme.colors.purple} !important;
                color: ${theme.colors.everglade} !important;
              }
              @media (min-width: 768px) {
                .md-row-center { flex-direction: row !important; }
              }
            `}</style>
            <BirdcreekLogo />
            <div style={{ maxWidth: "38rem" }}>
              <h3
                style={{
                  color: theme.colors.everglade,
                  fontSize: "clamp(1.875rem, 5vw, 3rem)",
                  lineHeight: 1,
                  marginBottom: "1.5rem",
                  fontFamily: theme.fonts.headline,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  transition: "color 0.7s",
                }}
              >
                {birdcreekAdvantage.title}
              </h3>
              <div
                style={{
                  color: mix(theme.colors.everglade, 60),
                  lineHeight: 1.6,
                  transition: "color 0.7s",
                  fontWeight: 500,
                  fontSize: "1.1rem",
                }}
              >
                <RichText
                  paragraphStyle={{
                    color: "inherit",
                    lineHeight: "inherit",
                    fontSize: "inherit",
                  }}
                  value={birdcreekAdvantage.description}
                />
              </div>
            </div>

            <a
              className="group-advantage-cta"
              href={birdcreekAdvantage.ctaHref}
              onClick={() =>
                posthog?.capture("birdcreek_link_clicked", {
                  cta_label: birdcreekAdvantage.ctaLabel,
                  cta_href: birdcreekAdvantage.ctaHref,
                  services_variant: "control",
                })
              }
              rel="noopener noreferrer"
              style={{
                backgroundColor: theme.colors.everglade,
                color: theme.colors.white,
                padding: "1.25rem 2.5rem",
                fontFamily: theme.fonts.headline,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "0.75rem",
                border: "none",
                cursor: "pointer",
                borderRadius: theme.radius.medium,
                transition: "all 0.3s",
                textDecoration: "none",
                display: "inline-block",
              }}
              tabIndex={0}
              target="_blank"
            >
              {birdcreekAdvantage.ctaLabel}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
