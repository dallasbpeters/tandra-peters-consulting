import React from "react";
import { motion } from "motion/react";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import { MissionProps } from "../types";
import { RichText } from "../portableText/RichText";

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
      image:
        "/Image-1774131541900.jpg",
    },
    {
      id: "02",
      title: "Optimistic",
      description:
        "We choose to be optimistic in how we see every interaction and opportunity. We choose to believe the best in others.",
      image:
        "/Image-1774131578178.jpg",
    },
    {
      id: "03",
      title: "Driven",
      description:
        "We are driven each year to help more Texas homeowners with unparalleled customer service. We are committed to an experience and service that you will want to tell others about.",
      image:
        "/Image-1774131587458.jpg",
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
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "6rem",
    color: theme.colors.paper,
    gap: "3rem",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
  };

  const cardBaseStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: "1rem",
    padding: "2rem",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.5s",
  };

  const mainCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
    minHeight: "500px",
  };

  const secondaryCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
    minHeight: "420px",
  };

  return (
    <section
      id="mission"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="mission-heading"
    >
      <div className={layoutClass.containerWide}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={headerStyle}
          className="md-row-end"
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
                marginBottom: "1.5rem",
                display: "block",
              }}
            >
              {tagline}
            </span>
            <div
              id="mission-heading"
              role="heading"
              aria-level={2}
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
                value={title}
                paragraphStyle={{
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  fontWeight: "inherit",
                  color: "inherit",
                }}
              />
            </div>
          </div>
          <div
            style={{
              maxWidth: "24rem",
              color: mix(theme.colors.paper, 60),
              lineHeight: 1.6,
              fontSize: "1.1rem",
            }}
          >
            <RichText
              value={description}
              paragraphStyle={{
                color: "inherit",
                lineHeight: "inherit",
                fontSize: "inherit",
              }}
            />
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={gridStyle}
          className="mission-grid"
        >
          <style>{`
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
                key={service.id}
                variants={cardVariants}
                style={isMain ? mainCardStyle : secondaryCardStyle}
                className="mission-grid-item mission-card"
              >
                {service.image ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.5,
                      transition: "opacity 0.7s",
                    }}
                    className="mission-card-bg"
                    aria-hidden
                  >
                    <img
                      src={service.image}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : null}
                <div style={{ position: "relative", zIndex: 10 }}>
                  <h3
                    style={{
                      color: theme.colors.white,
                      fontSize: "2.475rem",
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
                      fontSize: "1.1rem",
                      fontWeight: 500,
                    }}
                  >
                    <RichText
                      flow="heading"
                      value={service.description}
                      paragraphStyle={{
                        color: "inherit",
                        lineHeight: "inherit",
                        fontSize: "inherit",
                        fontWeight: "inherit",
                      }}
                      linkStyle={{ color: theme.colors.accentLight }}
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
