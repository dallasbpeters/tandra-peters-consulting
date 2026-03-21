import React from "react";
import { motion } from "motion/react";
import { Hammer, Ruler, Building2, CloudHail } from "lucide-react";
import { theme } from "../theme";
import { ExpertiseProps } from "../types";

export const Expertise: React.FC<ExpertiseProps> = ({
  tagline = "My Expertise",
  title = "Specialized Knowledge.",
  items = [
    { icon: Hammer, title: "Shingle Roofs", desc: "Shingle roofs are the most common type of roof and are made of asphalt, wood, or other materials." },
    { icon: Ruler, title: "Metal Roofs", desc: "Metal roofs are a durable and long-lasting option for roofs." },
    { icon: Building2, title: "Commercial", desc: "Specialized consulting for large-scale commercial roofing projects." },
    { icon: CloudHail, title: "Hail & Storm Damage", desc: "Hail and storm damage can cause significant damage to your roof." }
  ]
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const sectionStyle: React.CSSProperties = {
    paddingTop: "8rem",
    paddingBottom: "8rem",
    backgroundColor: theme.colors.everglade,
    color: theme.colors.white,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "6rem",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "3rem",
  };

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={headerStyle}
        >
          <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: theme.colors.accentLight, fontSize: "0.75rem", marginBottom: "1.5rem", display: "block" }}>{tagline}</span>
          <h2 style={{ fontSize: "clamp(3rem, 8vw, 4.5rem)", lineHeight: 1, fontFamily: theme.fonts.headline, fontWeight: 700, textTransform: "uppercase" }}>{title}</h2>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={gridStyle}
        >
          {items.map((item, i) => (
            <motion.div key={i} variants={itemVariants} style={{ textAlign: "center" }} className="group">
              <style>{`
                .group:hover .icon-container { background-color: ${theme.colors.accentLight} !important; color: ${theme.colors.everglade} !important; }
                .group:hover p { opacity: 1 !important; }
              `}</style>
              <div style={{ width: "5rem", height: "5rem", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", transition: "all 0.5s" }} className="icon-container">
                <item.icon size={32} />
              </div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontFamily: theme.fonts.headline, fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{item.title}</h3>
              <p style={{ color: theme.colors.evergladeMuted, fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "200px", margin: "0 auto", opacity: 0.6, transition: "opacity 0.3s" }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
