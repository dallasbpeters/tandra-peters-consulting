import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme";
import { AboutProps } from "../types";

export const About: React.FC<AboutProps> = ({
  badgeText = "5+ YEARS",
  badgeSubtext = "Industry Expertise",
  imageSrc = "/tandra.png",
  title = (
    <>
      Precision. Integrity.<br/>Tandra Peters.
    </>
  ),
  paragraphs = [
    "In an industry often characterized by noise, Tandra Peters offers a voice of architectural clarity. As Austin's leading roofing consultant, she bridges the gap between complex construction requirements and homeowner peace of mind.",
    "Partnering with BirdCreek Roofing allows Tandra to provide not just advice, but the executable expertise of a top-tier firm. Her approach is rooted in the \"Architectural Advisor\" philosophy—where every roof is treated as a critical structural component and a long-term investment."
  ],
  linkText = "Read Full Bio",
  linkHref = "#"
}) => {
  const sectionStyle: React.CSSProperties = {
    paddingTop: "8rem",
    paddingBottom: "8rem",
    backgroundColor: theme.colors.paper,
    overflow: "hidden",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "5rem",
    alignItems: "center",
  };

  const imageContainerStyle: React.CSSProperties = {
    position: "relative",
  };

  const imageWrapperStyle: React.CSSProperties = {
    aspectRatio: "4/5",
    backgroundColor: theme.colors.paperDark,
    borderRadius: "1rem",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "-2.5rem",
    right: "-2.5rem",
    backgroundColor: theme.colors.everglade,
    padding: "2.5rem",
    display: "none",
  };

  const h2Style: React.CSSProperties = {
    fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
    lineHeight: 1,
    marginBottom: "2.5rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    textTransform: "uppercase",
  };

  const pStyle: React.CSSProperties = {
    color: `${theme.colors.everglade}cc`, // 80% opacity
    lineHeight: 1.6,
    fontSize: "1.125rem",
    marginBottom: "2rem",
  };

  const linkWrapperStyle: React.CSSProperties = {
    marginTop: "4rem",
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  };

  return (
    <section id="about-tandra" style={sectionStyle}>
      <div style={containerStyle} className="lg-grid">
        <style>{`
          @media (min-width: 1024px) {
            .lg-grid { grid-template-columns: repeat(12, 1fr) !important; }
            .lg-col-5 { grid-column: span 5 / span 5 !important; }
            .lg-col-7 { grid-column: span 7 / span 7 !important; }
            .md-block { display: block !important; }
          }
        `}</style>
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={imageContainerStyle}
          className="lg-col-5"
        >
          <div style={imageWrapperStyle}>
            <img 
              src={imageSrc} 
              alt="Tandra Peters" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              referrerPolicy="no-referrer"
            />
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={badgeStyle}
            className="md-block"
          >
            <p style={{ fontFamily: theme.fonts.headline, fontWeight: 900, color: theme.colors.white, fontSize: "3rem", letterSpacing: "-0.05em", lineHeight: 1, margin: 0 }}>{badgeText}</p>
            <p style={{ fontFamily: theme.fonts.headline, fontWeight: 700, color: theme.colors.evergladeMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginTop: "0.5rem", margin: 0 }}>{badgeSubtext}</p>
          </motion.div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="lg-col-7"
        >
          <h2 style={h2Style}>
            {title}
          </h2>
          <div style={{ maxWidth: "42rem" }}>
            {paragraphs.map((p, i) => (
              <p key={i} style={pStyle}>
                {p}
              </p>
            ))}
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            style={linkWrapperStyle}
          >
            <div style={{ width: "5rem", height: "1px", backgroundColor: theme.colors.paperDark }}></div>
            <a href={linkHref} style={{ fontFamily: theme.fonts.headline, fontWeight: 900, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.3em", textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.accent} onMouseLeave={(e) => e.currentTarget.style.color = "inherit"}>{linkText}</a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
