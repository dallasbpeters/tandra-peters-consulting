import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme";
import { MissionProps } from "../types";

export const Mission: React.FC<MissionProps> = ({
  tagline = "Our Mission",
  title = (
    <>
      The vision we set out with has now impacted over 20,000 homeowners.
    </>
  ),
  description = "Our amazing group of Birdcreek Roofing Consultants has helped us receive several prestigious awards for the service and care of our customers. We’re providing unparalleled customer service no matter where we are.",
  services = [
    {
      id: "01",
      title: "generous",
      description:
        "We choose to be generous with the time we invest with our customers, and their homes. We are generous with our team members, in the communities we call home.",
      image:
        "/Image-1774131541900.jpg",
    },
    {
      id: "02",
      title: "optimistic",
      description:
        "We choose to be optimistic in how we see every interaction and opportunity. We choose to believe the best in others.",
      image:
        "/Image-1774131578178.jpg",
    },
    {
      id: "03",
      title: "driven",
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
    paddingTop: "8rem",
    paddingBottom: "8rem",
    backgroundColor: theme.colors.evergladeLight,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
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
    gap: "2rem",
  };

  const cardBaseStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: "1rem",
    padding: "3rem",
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
    <section id="services" style={sectionStyle}>
      <div style={containerStyle}>
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
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: theme.colors.accent,
                fontSize: "0.75rem",
                marginBottom: "1.5rem",
                display: "block",
              }}
            >
              {tagline}
            </span>
            <h2
              style={{
                fontSize: "clamp(3rem, 10vw, 4rem)",
                lineHeight: 1,
                fontFamily: theme.fonts.headlineAlt,
                fontWeight: 400,
                color: theme.colors.paper,
              }}
            >
              {title}
            </h2>
          </div>
          <div
            style={{
              maxWidth: "24rem",
              color: `${theme.colors.paper}99`,
              lineHeight: 1.6,
              fontSize: "1.1rem",
            }}
          >
            {description}
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={gridStyle}
          className="services-grid"
        >
          <style>{`
            .mission-card:hover .mission-card-bg { opacity: 0.3 !important; }
            .mission-card:hover .mission-card-icon { transform: scale(1.1) !important; }
            .mission-card:hover .mission-card-arrow { transform: rotate(45deg) !important; }
            .mission-card:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important; }
          `}</style>
          {services.map((service, i) => {
            const isMain = i === 0;
            const ServiceIcon = service.icon;
            return (
              <motion.div
                key={service.id}
                variants={cardVariants}
                style={isMain ? mainCardStyle : secondaryCardStyle}
                className={`${isMain ? "services-span-4" : "services-span-4"} mission-card`}
              >
                {service.image ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.2,
                      transition: "opacity 0.7s",
                    }}
                    className="mission-card-bg"
                  >
                    <img
                      src={service.image}
                      alt={service.title}
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
                      fontSize: "1.875rem",
                      lineHeight: isMain ? 1 : 1.25,
                      marginBottom: "1.5rem",
                      fontFamily: theme.fonts.headline,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {service.title}
                  </h3>
                  <p
                    style={{
                      color: theme.colors.evergladeMuted,
                      maxWidth: isMain ? "28rem" : "none",
                      lineHeight: 1.6,
                      fontSize: "1rem",
                    }}
                  >
                    {service.description}
                  </p>
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
                      color: "rgba(255, 255, 255, 0.2)",
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
