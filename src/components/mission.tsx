import { motion } from "motion/react";
import type React from "react";

import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { MissionProps } from "../types";

export const Mission: React.FC<MissionProps> = ({
  tagline = "Our Mission",
  title = "The vision we set out with has now impacted over 20,000 homeowners.",
  description = "Birdcreek Roofing’s consultant team has earned national recognition for customer care and consistent workmanship. That same service mindset guides every homeowner interaction—whether you are in Austin, elsewhere in Texas, or coordinating a complex project from out of state.",
  services = [
    {
      description:
        "We choose to be generous with the time we invest with our customers, and their homes. We are generous with our team members, in the communities we call home.",
      id: "01",
      image: "/Image-1774131541900.jpg",
      title: "Generous",
    },
    {
      description:
        "We choose to be optimistic in how we see every interaction and opportunity. We choose to believe the best in others.",
      id: "02",
      image: "/Image-1774131578178.jpg",
      title: "Optimistic",
    },
    {
      description:
        "We are driven each year to help more Texas homeowners with unparalleled customer service. We are committed to an experience and service that you will want to tell others about.",
      id: "03",
      image: "/Image-1774131587458.jpg",
      title: "Driven",
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
    visible: { opacity: 1, transition: { duration: 0.6 }, y: 0 },
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.palette.everglade["800"],
  };

  const headerStyle: React.CSSProperties = {
    color: theme.colors.paper,
    marginBottom: theme.spacing.xxxxxxxxl,
  };

  const cardBaseStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.large,
    overflow: "hidden",
    padding: theme.spacing.xxxxl,
    position: "relative",
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
                color: theme.colors.purple,
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.2em",
                marginBottom: theme.spacing.xxl,
                textTransform: "uppercase",
              }}
            >
              {tagline}
            </span>
            <h2
              id="mission-heading"
              style={{
                color: theme.colors.paper,
                fontFamily: theme.fonts.headlineAlt,
                fontSize: "clamp(3rem, 10vw, 4rem)",
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              <RichText
                flow="heading"
                paragraphStyle={{
                  color: "inherit",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  fontWeight: "inherit",
                  lineHeight: "inherit",
                }}
                value={title}
              />
            </h2>
          </div>
          <div
            style={{
              color: theme.colors.paper,
              fontSize: "1.1rem",
              lineHeight: 1.6,
              maxWidth: "24rem",
            }}
          >
            <RichText
              paragraphStyle={{
                color: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
              }}
              value={description}
            />
          </div>
        </motion.div>

        <motion.div
          className="mission-grid"
          initial="hidden"
          variants={containerVariants}
          viewport={{ margin: "-100px", once: true }}
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
                      inset: 0,
                      opacity: 0.5,
                      position: "absolute",
                      transition: "opacity 0.7s",
                    }}
                  >
                    {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
                    <img
                      alt=""
                      referrerPolicy="no-referrer"
                      src={service.image}
                      style={{
                        height: "100%",
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                  </div>
                ) : null}
                <div style={{ position: "relative", zIndex: 10 }}>
                  <h3
                    style={{
                      color: theme.colors.white,
                      fontFamily: theme.fonts.headline,
                      fontSize: "2.475rem",
                      fontWeight: 800,
                      lineHeight: isMain ? 1 : 1.25,
                      marginBottom: theme.spacing.xxl,
                      textTransform: "uppercase",
                    }}
                  >
                    {service.title}
                  </h3>
                  <div
                    style={{
                      color: theme.colors.white,
                      fontSize: "1.1rem",
                      fontWeight: 500,
                      lineHeight: 1.6,
                      maxWidth: isMain ? "28rem" : "none",
                    }}
                  >
                    <RichText
                      flow="heading"
                      linkStyle={{ color: theme.colors.accentLight }}
                      paragraphStyle={{
                        color: "inherit",
                        fontSize: "inherit",
                        fontWeight: "inherit",
                        lineHeight: "inherit",
                      }}
                      value={service.description}
                    />
                  </div>
                </div>
                <div
                  style={{
                    alignItems: "flex-end",
                    display: "flex",
                    justifyContent: "space-between",
                    position: "relative",
                    zIndex: 10,
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255, 255, 255, 0.5)",
                      fontFamily: theme.fonts.headline,
                      fontSize: isMain ? "6rem" : "3.75rem",
                      fontWeight: 900,
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
