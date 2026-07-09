import { motion } from "motion/react";
import type React from "react";

import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { mix, theme } from "../theme";
import type { ExpertiseProps } from "../types";

export const Expertise: React.FC<ExpertiseProps> = ({
  tagline = "Roof types & scenarios",
  title = "Consulting expertise by system.",
  items = [
    {
      desc: "Guidance on shingle grades, ventilation, flashing details, and when repair versus full replacement is the smarter investment—especially before you file an insurance claim.",
      id: "01",
      image: "/shingles.jpg",
      title: "Asphalt shingle roofs",
    },
    {
      desc: "Help comparing standing seam versus exposed-fastener systems, coating longevity, wind ratings, and how metal performs in Texas heat and hail-prone seasons.",
      id: "02",
      image: "/metal-roof.jpg",
      title: "Metal roofing",
    },
    {
      desc: "Coordination support for low-slope assemblies, maintenance planning, capital budgets, and contractor scope reviews on larger buildings—not just residential tear-offs.",
      id: "03",
      image: "/commercial.jpg",
      title: "Commercial roofing",
    },
    {
      desc: "Document storm impact, interpret adjuster findings, and build a clear scope of work so repairs restore weather-tight performance—not just cosmetic patches.",
      id: "04",
      image: "/hail-storm.jpg",
      title: "Hail & storm damage",
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
    visible: { opacity: 1, transition: { duration: 0.6 }, y: 0 },
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    borderBottom: `1px solid ${mix(theme.colors.paperDark, 6)}`,
    color: theme.colors.white,
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: theme.spacing.xxxxxxxxl,
    textAlign: "center",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.large,
    minHeight: "400px",
    overflow: "hidden",
    padding: theme.spacing.xxl,
    position: "relative",
    transition: "all 0.5s",
  };

  return (
    <section
      aria-labelledby="expertise-heading"
      className={layoutClass.sectionPadded}
      id="expertise"
      style={sectionStyle}
    >
      <div className={layoutClass.containerWide}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          style={headerStyle}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span
            style={{
              color: theme.palette.coral["300"],
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
            id="expertise-heading"
            style={{
              fontFamily: theme.fonts.headline,
              fontSize: "clamp(3rem, 8vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h2>
        </motion.div>

        <motion.div
          className="expertise-grid"
          initial="hidden"
          variants={containerVariants}
          viewport={{ margin: "-100px", once: true }}
          whileInView="visible"
        >
          <style>{`
            .expertise-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: var(--wa-space-2xl);
            }
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
                0 11px 11px -5px rgba(0, 0, 0, 0.2) !important;
            }
          `}</style>
          {items.map((item) => (
            <motion.div
              className="layout-col-between expertise-card"
              key={item.id}
              style={cardStyle}
              variants={cardVariants}
            >
              {item.image ? (
                <div
                  className="expertise-card-bg"
                  style={{
                    inset: 0,
                    opacity: 0.6,
                    position: "absolute",
                    transition: "opacity 0.7s",
                  }}
                >
                  {/* biome-ignore lint/correctness/useImageSize: dynamic size fills container via CSS */}
                  <img
                    alt={`${item.title} — roofing consultation context`}
                    decoding="async"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={item.image}
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
                    fontSize: "1.875rem",
                    fontWeight: 800,
                    lineHeight: 1.25,
                    marginBottom: theme.spacing.xxl,
                    textTransform: "uppercase",
                  }}
                >
                  {item.title}
                </h3>
                <div
                  style={{
                    color: theme.colors.paper,
                    fontSize: "1rem",
                    lineHeight: 1.6,
                    maxWidth: "28rem",
                  }}
                >
                  <RichText
                    flow="heading"
                    linkStyle={{ color: theme.colors.accentLight }}
                    paragraphStyle={{
                      color: "inherit",
                      fontSize: "inherit",
                      lineHeight: "inherit",
                    }}
                    value={item.desc}
                  />
                </div>
              </div>
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  justifyContent: "flex-start",
                  position: "relative",
                  zIndex: 10,
                }}
              >
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.2)",
                    fontFamily: theme.fonts.headline,
                    fontSize: "3.75rem",
                    fontWeight: 900,
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
