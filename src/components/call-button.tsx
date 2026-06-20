import { usePostHog } from "@posthog/react";
import { motion } from "motion/react";
import type React from "react";

import { theme } from "../theme";

export const CallButton = ({
  label = "Call or text 512-968-3965",
  phone = "(512) 968-3965",
}) => {
  const posthog = usePostHog();
  const labelStyle: React.CSSProperties = {
    color: theme.colors.white,
    fontFamily: theme.fonts.body,
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
  };

  const buttonStyle: React.CSSProperties = {
    alignItems: "center",
    backgroundColor: theme.colors.everglade,
    border: "none",
    borderLeft: `1px solid ${theme.colors.white}`,
    borderRight: `1px solid ${theme.colors.white}`,
    borderTop: `1px solid ${theme.colors.white}`,
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
    color: theme.colors.everglade,
    cursor: "pointer",
    display: "inline-block",
    fontFamily: theme.fonts.headline,
    fontSize: "1rem",
    fontWeight: 900,
    gap: theme.spacing.sm,
    letterSpacing: "0.1em",
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    position: "fixed",
    right: "0",
    textAlign: "center",
    textDecoration: "none",
    textTransform: "uppercase",
    top: "50%",
    transform: "rotate(90deg)",
    transformOrigin: "right bottom",
    whiteSpace: "nowrap",
    zIndex: 1000,
  };
  return (
    <motion.button
      initial={{ opacity: 0, rotate: -90, x: -20 }}
      onTap={() => {
        const method = window.innerWidth < 768 ? "sms" : "tel";
        posthog?.capture("call_button_tapped", { method, phone });
        if (method === "sms") {
          window.location.href = `sms:${phone}`;
        } else {
          window.location.href = `tel:${phone}`;
        }
      }}
      style={buttonStyle}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, rotate: -90, x: 0 }}
    >
      <span style={labelStyle}>{label}</span>
    </motion.button>
  );
};
