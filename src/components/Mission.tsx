import { motion } from "motion/react";
import type React from "react";

import { RichText } from "../portableText/RichText";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import type { MissionProps } from "../types";

export const Mission: React.FC<MissionProps> = ({
  tagline = "Our Mission",
  title = "The vision we set out with has now impacted over 20,000 homeowners.",
  description = "Birdcreek Roofing’s consultant team has earned national recognition for customer care and consistent workmanship. That same service mindset guides every homeowner interaction—whether you are in Austin, elsewhere in Texas, or coordinating a complex project from out of state.",
  services = [
    {
      id: "01",
      title: "Generous",
      description:
        "We choose to be generous with the time we invest with our customers, and their homes. We are generous with our team members, in the communities we call home.",
      image: "/Image-1774131541900.jpg",
    },
    {
      id: "02",
      title: "Optimistic",
      description:
        "We choose to be optimistic in how we see every interaction and opportunity. We choose to believe the best in others.",
      image: "/Image-1774131578178.jpg",
    },
    {
      id: "03",
      title: "Driven",
      description:
        "We are driven each year to help more Texas homeowners with unparalleled customer service. We are committed to an experience and service that you will want to tell others about.",
      image: "/Image-1774131587458.jpg",
    },
  ],
}) => {
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
    backgroundColor: theme.palette.everglade["800"],
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: theme.spacing.xxxxxxxxl,
    color: theme.colors.paper,
  };

  const cardBaseStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.large,
    padding: theme.spacing.xxxxl,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.5s",
  };

  const mainCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
    minHeight: "500px",
  };

  const secondaryCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
    minHeight: "300px",
  };

  return (
    <section
      aria-labelledby="mission-heading"
      className={layoutClass.sectionPadded}
      id="mission"
      style={sectionStyle}
    >
      <div className={layoutClass.containerWide}>
        <motion.div
          className="layout-col-between wa-align-items-end wa-gap-4xl md-row-end"
          initial={{ opacity: 0, y: 20 }}
          style={headerStyle}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <style>{`
            @media (min-width: 768px) {
              .md-row-end { flex-direction: row !important; }
              .mission-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }
              .mission-grid-item { grid-column: span 1 !important; }
            }
          `}</style>
          <div style={{ maxWidth: "42rem" }}>
            <span
              style={{
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: theme.colors.purple,
                fontSize: "0.75rem",
                marginBottom: theme.spacing.xxl,
                display: "block",
              }}
            >
              {tagline}
            </span>
            <h2
              id="mission-heading"
              style={{
                fontSize: "clamp(3rem, 10vw, 4rem)",
                lineHeight: 1,
                fontFamily: theme.fonts.headlineAlt,
                fontWeight: 400,
                color: theme.colors.paper,
              }}
            >
              <RichText
                flow="heading"
                paragraphStyle={{
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  fontWeight: "inherit",
                  color: "inherit",
                }}
                value={title}
              />
            </h2>
          </div>
          <div
            style={{
              maxWidth: "24rem",
              color: theme.colors.paper,
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
          className="mission-grid"
          initial="hidden"
          variants={containerVariants}
          viewport={{ once: true, margin: "-100px" }}
          whileInView="visible"
        >
          <style>{`
            .mission-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: var(--wa-space-s);
            }
            .mission-card:hover .mission-card-bg { opacity: 0.3 !important; }
            .mission-card:hover .mission-card-bg img {
              transform: scale(1.08) !important;
            }
            .mission-card .mission-card-bg img {
              transform: scale(1);
              transform-origin: center center;
              transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .mission-card:hover .mission-card-icon { transform: scale(1.1) !important; }
            .mission-card:hover .mission-card-arrow { transform: rotate(45deg) !important; }
            .mission-card:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 11px 11px -5px rgba(0, 0, 0, 0.1) !important; }
            @media (prefers-reduced-motion: reduce) {
              .mission-card:hover .mission-card-bg img { transform: none !important; }
              .mission-card .mission-card-bg img { transition: none; }
            }
          `}</style>
          {services.map((service, i) => {
            const isMain = i === 0;
            return (
              <motion.div
                className="layout-col-between mission-grid-item mission-card"
                key={service.id}
                style={isMain ? mainCardStyle : secondaryCardStyle}
                variants={cardVariants}
              >
                {service.image ? (
                  <div
                    aria-hidden
                    className="mission-card-bg"
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.5,
                      transition: "opacity 0.7s",
                    }}
                  >
                    {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
                    <img
                      alt=""
                      referrerPolicy="no-referrer"
                      src={service.image}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : null}
                <div style={{ position: "relative", zIndex: 10 }}>
                  <h3
                    style={{
                      color: theme.colors.white,
                      fontSize: "2.475rem",
                      lineHeight: isMain ? 1 : 1.25,
                      marginBottom: theme.spacing.xxl,
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
                      fontSize: "1.1rem",
                      fontWeight: 500,
                    }}
                  >
                    <RichText
                      flow="heading"
                      linkStyle={{ color: theme.colors.accentLight }}
                      paragraphStyle={{
                        color: "inherit",
                        lineHeight: "inherit",
                        fontSize: "inherit",
                        fontWeight: "inherit",
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
                      color: "rgba(255, 255, 255, 0.5)",
                      fontFamily: theme.fonts.headline,
                      fontWeight: 900,
                      fontSize: isMain ? "6rem" : "3.75rem",
                      lineHeight: 1,
                    }}
                  >
                    {service.id}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
