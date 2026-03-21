import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Search, FileText, ShieldCheck } from "lucide-react";
import { theme } from "../theme";
import { ServicesProps } from "../types";

export const Services: React.FC<ServicesProps> = ({
  tagline = "Strategic Services",
  title = (
    <>
      Consultation.
      <br />
      Precision.
      <br />
      Execution.
    </>
  ),
  description = "I provide a comprehensive suite of roofing solutions, from initial assessment to final project oversight.",
  services = [
    {
      id: "01",
      title: "Comprehensive Roof Assessment",
      description:
        "A deep-dive analysis of your current roofing system, identifying structural weaknesses and long-term maintenance needs.",
      icon: Search,
      image:
        "/roof-2.jpg",
    },
    {
      id: "02",
      title: "Insurance Claim Advocacy",
      description:
        "Expert navigation of the insurance landscape to ensure you receive the full value of your coverage.",
      icon: FileText,
    },
    {
      id: "03",
      title: "Project Oversight",
      description:
        "End-to-end management of your roofing project, ensuring BirdCreek's high standards are met at every stage.",
      icon: ShieldCheck,
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
    backgroundColor: theme.colors.paperDim,
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
    gap: "2rem",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
  };

  const mainCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    borderRadius: "1rem",
    padding: "3rem",
    position: "relative",
    overflow: "hidden",
    minHeight: "500px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.5s",
  };

  const secondaryCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.white,
    borderRadius: "1rem",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: `1px solid ${theme.colors.paperDark}33`,
    transition: "all 0.5s",
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
                fontSize: "clamp(3rem, 10vw, 6rem)",
                lineHeight: 1,
                fontFamily: theme.fonts.headline,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {title}
            </h2>
          </div>
          <div
            style={{
              maxWidth: "24rem",
              color: `${theme.colors.everglade}99`,
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
          {services.map((service, i) => {
            const isMain = i === 0;
            return (
              <motion.div
                key={service.id}
                variants={cardVariants}
                style={isMain ? mainCardStyle : secondaryCardStyle}
                className={`${isMain ? "services-span-8" : "services-span-4"} group`}
              >
                {isMain && service.image && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.2,
                      transition: "opacity 0.7s",
                    }}
                    className="group-hover-opacity"
                  >
                    <style>{`
                      .group:hover .group-hover-opacity { opacity: 0.3 !important; }
                      .group:hover .group-hover-scale { transform: scale(1.1) !important; }
                      .group:hover .group-hover-rotate { transform: rotate(45deg) !important; }
                    `}</style>
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
                )}
                <div style={{ position: "relative", zIndex: 10 }}>
                  <div
                    style={{
                      width: isMain ? "4rem" : "3rem",
                      height: isMain ? "4rem" : "3rem",
                      backgroundColor: isMain
                        ? theme.colors.accentLight
                        : theme.colors.paperDim,
                      borderRadius: "9999px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "2.5rem",
                      transition: "all 0.5s",
                    }}
                    className={
                      isMain ? "group-hover-scale" : "group-hover-bg-accent"
                    }
                  >
                    {!isMain && (
                      <style>{`
                        .group:hover .group-hover-bg-accent { background-color: ${theme.colors.accentLight} !important; }
                        .group:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important; }
                      `}</style>
                    )}
                    <service.icon style={{ color: theme.colors.everglade }} />
                  </div>
                  <h3
                    style={{
                      color: isMain
                        ? theme.colors.white
                        : theme.colors.everglade,
                      fontSize: isMain
                        ? "clamp(2rem, 5vw, 3.75rem)"
                        : "1.875rem",
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
                      color: isMain
                        ? theme.colors.evergladeMuted
                        : `${theme.colors.everglade}99`,
                      maxWidth: isMain ? "28rem" : "none",
                      lineHeight: 1.6,
                      fontSize: isMain ? "1rem" : "1.1rem",
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
                      color: isMain
                        ? "rgba(255, 255, 255, 0.2)"
                        : theme.colors.paperDark,
                      fontFamily: theme.fonts.headline,
                      fontWeight: 900,
                      fontSize: isMain ? "6rem" : "3.75rem",
                      lineHeight: 1,
                    }}
                  >
                    {service.id}
                  </span>
                  <button
                    style={{
                      backgroundColor: isMain
                        ? "rgba(255, 255, 255, 0.1)"
                        : "transparent",
                      color: isMain
                        ? theme.colors.white
                        : "rgba(0, 26, 16, 0.4)",
                      padding: isMain ? "1.5rem" : "0",
                      borderRadius: "9999px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                    className={isMain ? "group-hover-rotate" : ""}
                    onMouseEnter={(e) =>
                      !isMain &&
                      (e.currentTarget.style.color = theme.colors.everglade)
                    }
                    onMouseLeave={(e) =>
                      !isMain &&
                      (e.currentTarget.style.color = "rgba(0, 26, 16, 0.4)")
                    }
                  >
                    <ArrowUpRight size={isMain ? 32 : 24} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          <motion.div
            variants={cardVariants}
            style={{
              backgroundColor: theme.colors.paperDark,
              borderRadius: "1rem",
              padding: "3rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "start",
              justifyContent: "space-between",
              gap: "1rem",
              transition: "all 0.7s",
            }}
            className="services-span-8 group-advantage"
          >
            <style>{`
              .group-advantage:hover { background-color: ${theme.colors.everglade} !important; }
              .group-advantage:hover h3 { color: white !important; }
              .group-advantage:hover p { color: ${theme.colors.evergladeMuted} !important; }
              .group-advantage:hover button { background-color: ${theme.colors.accentLight} !important; color: ${theme.colors.everglade} !important; }
              @media (min-width: 768px) {
                .md-row-center { flex-direction: row !important; }
              }
            `}</style>
            <div style={{ maxWidth: "28rem" }}>
              <h3
                style={{
                  color: theme.colors.everglade,
                  fontSize: "clamp(1.875rem, 5vw, 3rem)",
                  lineHeight: 1,
                  marginBottom: "1.5rem",
                  fontFamily: theme.fonts.headline,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  transition: "color 0.7s",
                }}
              >
                The BirdCreek Advantage
              </h3>
              <p
                style={{
                  color: `${theme.colors.everglade}99`,
                  lineHeight: 1.6,
                  transition: "color 0.7s",
                }}
              >
                Direct access to Austin's premier roofing firm, combining
                Tandra's consultation with BirdCreek's legendary execution.
              </p>
            </div>
            <a
              href="https://birdcreekroofing.com"
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
                transition: "all 0.3s",
                textDecoration: "none",
              }}
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
