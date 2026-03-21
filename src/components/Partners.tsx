import React from "react";
import { motion } from "motion/react";
import { Home, Verified } from "lucide-react";
import { theme } from "../theme";
import { PartnersProps } from "../types";

export const Partners: React.FC<PartnersProps> = ({
  title = "Strategic Partnership",
  partners = [
    { name: "BirdCreek Roofing", icon: Home },
    { name: "Austin Built", icon: Verified },
    { name: "Texas Standards", icon: Verified }
  ]
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paperDim,
    paddingTop: "4rem",
    paddingBottom: "4rem",
    borderBottom: `1px solid ${theme.colors.paperDark}33`, // 20% opacity
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3rem",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.3em",
    fontSize: "10px",
    color: theme.colors.evergladeMuted,
  };

  const partnersGridStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "3rem",
    opacity: 0.4,
    filter: "grayscale(100%)",
    transition: "all 0.5s",
  };

  const partnerItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  };

  const partnerTextStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    fontSize: "1.125rem",
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: "-0.05em",
  };

  return (
    <section style={sectionStyle}>
      <div style={containerStyle} className="md-row">
        <style>{`
          @media (min-width: 768px) {
            .md-row { flex-direction: row !important; }
          }
        `}</style>
        <motion.span 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          style={labelStyle}
        >
          {title}
        </motion.span>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={partnersGridStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.filter = "grayscale(0%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.4";
            e.currentTarget.style.filter = "grayscale(100%)";
          }}
        >
          {partners.map((partner, i) => (
            <motion.div key={i} variants={itemVariants} style={partnerItemStyle}>
              <partner.icon size={24} />
              <span style={partnerTextStyle}>{partner.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
