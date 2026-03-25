import React from "react";
import { motion } from "motion/react";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import { ExpertiseProps } from "../types";
import { RichText } from "../portableText/RichText";

export const Expertise: React.FC<ExpertiseProps> = ({
  tagline = "Roof types & scenarios",
  title = "Consulting expertise by system.",
  items = [
    {
      id: "01",
      title: "Asphalt shingle roofs",
      desc: "Guidance on shingle grades, ventilation, flashing details, and when repair versus full replacement is the smarter investment—especially before you file an insurance claim.",
      image: "/shingles.jpg",
    },
    {
      id: "02",
      title: "Metal roofing",
      desc: "Help comparing standing seam versus exposed-fastener systems, coating longevity, wind ratings, and how metal performs in Texas heat and hail-prone seasons.",
      image: "/metal-roof.jpg",
    },
    {
      id: "03",
      title: "Commercial roofing",
      desc: "Coordination support for low-slope assemblies, maintenance planning, capital budgets, and contractor scope reviews on larger buildings—not just residential tear-offs.",
      image: "/commercial.jpg",
    },
    {
      id: "04",
      title: "Hail & storm damage",
      desc: "Document storm impact, interpret adjuster findings, and build a clear scope of work so repairs restore weather-tight performance—not just cosmetic patches.",
      image: "/hail-storm.jpg",
    },
  ],
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    color: theme.colors.white,
    borderBottom: `1px solid ${mix(theme.colors.paperDark, 6)}`,
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "6rem",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "2rem",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: "1rem",
    padding: "1.5rem",
    position: "relative",
    overflow: "hidden",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.5s",
  };

  return (
    <section
      id="expertise"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="expertise-heading"
    >
      <div className={layoutClass.containerWide}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={headerStyle}
        >
          <span
            style={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: theme.palette.coral["300"],
              fontSize: "0.75rem",
              marginBottom: "1.5rem",
              display: "block",
            }}
          >
            {tagline}
          </span>
          <h2
            id="expertise-heading"
            style={{
              fontSize: "clamp(3rem, 8vw, 4.5rem)",
              lineHeight: 1,
              fontFamily: theme.fonts.headline,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={gridStyle}
          className="expertise-grid"
        >
          <style>{`
            @media (min-width: 768px) {
              .expertise-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
            @media (min-width: 1280px) {
              .expertise-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
            }
            .expertise-card:hover .expertise-card-bg {
              opacity: 0.3 !important;
            }
            .expertise-card:hover {
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35),
                0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
            }
          `}</style>
          {items.map((item) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              style={cardStyle}
              className="expertise-card"
            >
              {item.image ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.6,
                    transition: "opacity 0.7s",
                  }}
                  className="expertise-card-bg"
                >
                  <img
                    src={item.image}
                    alt={`${item.title} — roofing consultation context photo`}
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
                    lineHeight: 1.25,
                    marginBottom: "1.5rem",
                    fontFamily: theme.fonts.headline,
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  {item.title}
                </h3>
                <div
                  style={{
                    color: theme.colors.paper,
                    lineHeight: 1.6,
                    fontSize: "1rem",
                    maxWidth: "28rem",
                  }}
                >
                  <RichText
                    flow="heading"
                    value={item.desc}
                    paragraphStyle={{
                      color: "inherit",
                      lineHeight: "inherit",
                      fontSize: "inherit",
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
                  justifyContent: "flex-start",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.2)",
                    fontFamily: theme.fonts.headline,
                    fontWeight: 900,
                    fontSize: "3.75rem",
                    lineHeight: 1,
                  }}
                >
                  {item.id}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
