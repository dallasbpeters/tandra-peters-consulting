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
      Precision. Integrity.
    </>
  ),
  paragraphs = [
    "Tandra Peters is an Austin, Texas roofing consultant who translates complex roof science into decisions homeowners can trust. She focuses on what matters for durability, warranty coverage, and long-term value—not quick sales pitches.",
    "As a BirdCreek Roofing consultant, her recommendations sit inside the same company that performs the work—so there is a straight line from advice to professional installation and project management. Her Architectural Advisor approach treats every roof as both a structural system and a major financial asset you will live with for decades.",
  ],
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
    aspectRatio: "3/3.3",
    backgroundColor: theme.colors.paperDark,
    borderRadius: "1rem",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "-2.5rem",
    right: "-1.5rem",
    backgroundColor: theme.colors.everglade,
    padding: "1.5rem",
    borderRadius: ".75rem",
  };

  const certificationsStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
    gap: "1rem",
  };

  const certificationImageStyle: React.CSSProperties = {
    width: "auto",
    height: "4rem",
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

  return (
    <section id="about-tandra" style={sectionStyle} aria-labelledby="about-heading">
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
              alt="Tandra Peters, roofing consultant based in Austin, Texas"
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
          <h2 id="about-heading" style={h2Style}>
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
          style={certificationsStyle}>
            <img style={certificationImageStyle} src="/roofing-soloar-alliance.png" alt="Roofing Solar Alliance" />
            <img style={certificationImageStyle} src="/roof-pro.png" alt="Roof Pro" />
            <img style={certificationImageStyle} src="/tamko-pro.png" alt="Tamko Pro" />
            <img style={certificationImageStyle} src="/gaf-master-elite.png" alt="GAF Master Elite" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
