import type React from "react";

import { mix, theme } from "../../theme";

// ── Layout className strings (WA utilities) ───────────────────────────────
export const estimatorCardLayoutClass = "wa-stack wa-gap-l";
export const estimatorOptionsClass = "wa-grid wa-gap-xs estimator-options-grid";
export const estimatorOptionClass = "wa-stack wa-gap-3xs";
export const estimatorEmailRowClass = "wa-grid wa-gap-xs estimator-email-row";
export const estimatorFooterClass = "wa-split wa-gap-s";
export const foundStatusClass = "wa-cluster wa-gap-2xs wa-align-items-start";

// ── Visual-only inline styles ──────────────────────────────────────────────

export const primaryButtonStyle: React.CSSProperties = {
  alignItems: "center",
  backgroundColor: theme.colors.everglade,
  border: "none",
  borderRadius: theme.radius.large,
  color: theme.colors.white,
  cursor: "pointer",
  display: "inline-flex",
  fontFamily: theme.fonts.headline,
  fontSize: "0.875rem",
  fontWeight: 900,
  gap: theme.spacing.md,
  letterSpacing: "0.08em",
  marginTop: theme.spacing.xl,
  padding: `${theme.spacing.lg} ${theme.spacing.xxl}`,
  textTransform: "uppercase",
};

export const ghostButtonStyle: React.CSSProperties = {
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: theme.radius.medium,
  color: mix(theme.colors.everglade, 80),
  cursor: "pointer",
  display: "inline-flex",
  fontFamily: theme.fonts.headline,
  fontSize: "0.875rem",
  fontWeight: 700,
  gap: theme.spacing.sm,
  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
};

export const estimatorCardStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-colors-white, #fff)",
  borderRadius: "var(--theme-radius-large, 1rem)",
  marginBlockEnd: "var(--theme-spacing-section)",
  overflow: "hidden",
  width: "min(100%, 80rem)",
  zIndex: 10,
};

export const introCardStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-colors-white, #fff)",
  borderRadius: "var(--theme-radius-large, 1rem)",
  marginBlockEnd: "var(--theme-spacing-section)",
  overflow: "hidden",
  width: "min(100%, 40rem)",
  zIndex: 10,
};

export const estimatorOptionStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-colors-paper, #f3f5f4)",
  border: "2px solid var(--theme-colors-paper-dark, #e4e8e6)",
  borderRadius: "var(--theme-radius-medium, 0.75rem)",
  cursor: "pointer",
  padding: "1.1rem 1.25rem",
  textAlign: "left",
  transition:
    "border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
  width: "100%",
};

export const estimatorOptionArtStyle: React.CSSProperties = {
  aspectRatio: "16 / 9",
  borderRadius: "calc(var(--theme-radius-medium, 0.75rem) - 0.25rem)",
  display: "block",
  marginBlockEnd: "0.65rem",
  objectFit: "cover",
  width: "100%",
};

export const foundStatus: React.CSSProperties = {
  backgroundColor: mix(theme.colors.accent, 8),
  border: `1px solid ${mix(theme.colors.accent, 22)}`,
  borderRadius: theme.radius.medium,
  color: theme.colors.everglade,
  fontSize: "0.85rem",
  marginTop: theme.spacing.md,
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
};

export const eyebrow: React.CSSProperties = {
  color: theme.palette.coral["300"],
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 800,
  letterSpacing: "0.2em",
  marginBottom: theme.spacing.md,
  textTransform: "uppercase",
};
