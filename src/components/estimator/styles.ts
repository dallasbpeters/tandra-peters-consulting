import React from "react";

import { mix, theme } from "../../theme";

export const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: theme.colors.everglade,
  color: theme.colors.white,
  padding: `${theme.spacing.lg} ${theme.spacing.xxl}`,
  fontFamily: theme.fonts.headline,
  fontWeight: 900,
  textTransform: "uppercase",
  borderRadius: theme.radius.large,
  letterSpacing: "0.08em",
  fontSize: "0.875rem",
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing.md,
  border: "none",
  cursor: "pointer",
  marginTop: theme.spacing.xl,
};

export const ghostButtonStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: mix(theme.colors.everglade, 80),
  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
  fontFamily: theme.fonts.headline,
  fontWeight: 700,
  fontSize: "0.875rem",
  borderRadius: theme.radius.medium,
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  border: "none",
  cursor: "pointer",
};

export const estimatorIntroLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "1.5rem",
  alignItems: "start",
  justifyItems: "start",
  minBlockSize: "70vh",
};

export const estimatorCardLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "1.5rem",
  alignItems: "start",
  justifyItems: "start",
  minBlockSize: "70vh",
};

export const estimatorCardStyle: React.CSSProperties = {
  width: "min(100%, 80rem)",
  borderRadius: "var(--theme-radius-large, 1rem)",
  backgroundColor: "var(--theme-colors-white, #fff)",
  overflow: "hidden",
  marginBlockEnd: "var(--theme-spacing-section)",
  zIndex: 10,
};
export const introCardStyle: React.CSSProperties = {
  width: "min(100%, 40rem)",
  borderRadius: "var(--theme-radius-large, 1rem)",
  backgroundColor: "var(--theme-colors-white, #fff)",
  overflow: "hidden",
  marginBlockEnd: "var(--theme-spacing-section)",
  zIndex: 10,
};

export const estimatorOptionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
  gap: "0.75rem",
};

export const estimatorOptionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  textAlign: "left",
  width: "100%",
  padding: "1.1rem 1.25rem",
  borderRadius: "var(--theme-radius-medium, 0.75rem)",
  border: "2px solid var(--theme-colors-paper-dark, #e4e8e6)",
  backgroundColor: "var(--theme-colors-paper, #f3f5f4)",
  cursor: "pointer",
  transition:
    "border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
};

export const estimatorOptionArtStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  aspectRatio: "16 / 9",
  objectFit: "cover",
  borderRadius: "calc(var(--theme-radius-medium, 0.75rem) - 0.25rem)",
  marginBlockEnd: "0.65rem",
};

export const estimatorEmailRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
  gap: "0.75rem",
  marginBottom: theme.spacing.md,
};

export const estimatorFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
};

export const foundStatus: React.CSSProperties = {
  marginTop: theme.spacing.md,
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  backgroundColor: mix(theme.colors.accent, 8),
  border: `1px solid ${mix(theme.colors.accent, 22)}`,
  borderRadius: theme.radius.medium,
  fontSize: "0.85rem",
  color: theme.colors.everglade,
  display: "flex",
  gap: theme.spacing.sm,
  alignItems: "flex-start",
};

export const eyebrow: React.CSSProperties = {
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  color: theme.palette.coral["300"],
  fontSize: "0.75rem",
  marginBottom: theme.spacing.md,
  display: "block",
};
