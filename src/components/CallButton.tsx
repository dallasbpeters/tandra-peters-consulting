import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme";

export const CallButton = ({
  label = "Call or text 512-968-3965",
  phone = "(512) 968-3965",
}) => {
  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.3em",
    fontSize: "11px",
    color: theme.colors.white,
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    color: theme.colors.everglade,
    padding: ".75rem 1rem",
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    whiteSpace: "nowrap",
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    borderTopRightRadius: "6px",
    borderTopLeftRadius: "6px",
    borderLeft: `1px solid ${theme.colors.white}`,
    borderRight: `1px solid ${theme.colors.white}`,
    borderTop: `1px solid ${theme.colors.white}`,
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    position: "fixed",
    top: "50%",
    right: "0",
    zIndex: 1000,
    transform: "rotate(90deg)",
    transformOrigin: "right bottom",
    alignItems: "center",
    gap: "0.5rem",
  };
  return (
    <motion.button
      style={buttonStyle}
      initial={{ opacity: 0, x: -20, rotate: -90 }}
      whileInView={{ opacity: 1, x: 0, rotate: -90 }}
      viewport={{ once: true }}
      onTap={() => {
        if (window.innerWidth < 768) {
          window.location.href = `sms:${phone}`;
        } else {
          window.location.href = `tel:${phone}`;
        }
      }}
    >
      <span style={labelStyle}>{label}</span>
    </motion.button>
  );
};
