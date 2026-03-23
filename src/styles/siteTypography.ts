import type { CSSProperties } from "react";
import { mix, theme } from "../theme";

/**
 * Repeated type + color recipes (theme-aware). Pair with `layoutClasses` for shells.
 */
export const typeStyles = {
  pageListTitle: {
    fontFamily: theme.fonts.headlineAlt,
    fontWeight: 600,
    fontSize: "clamp(2rem, 5vw, 2.75rem)",
    lineHeight: 1.15,
    marginBottom: "0.75rem",
    color: theme.colors.everglade,
  } satisfies CSSProperties,

  pageListIntro: {
    fontSize: "1.05rem",
    lineHeight: 1.65,
    color: mix(theme.colors.everglade, 80),
    marginBottom: "2.5rem",
    maxWidth: "42rem",
  } satisfies CSSProperties,

  articleDetailTitle: {
    fontFamily: theme.fonts.headlineAlt,
    fontWeight: 600,
    fontSize: "clamp(1.75rem, 4vw, 2.35rem)",
    lineHeight: 1.2,
    marginBottom: "0.75rem",
    color: theme.colors.everglade,
  } satisfies CSSProperties,

  legalPageTitle: {
    fontFamily: theme.fonts.headlineAlt,
    fontWeight: 600,
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
    lineHeight: 1.15,
    marginBottom: "2rem",
    color: theme.colors.everglade,
  } satisfies CSSProperties,

  legalBody: {
    fontFamily: theme.fonts.body,
    fontSize: "1rem",
    lineHeight: 1.7,
    color: theme.colors.everglade,
  } satisfies CSSProperties,

  legalMuted: {
    fontSize: "0.875rem",
    color: mix(theme.colors.everglade, 60),
    marginBottom: "2rem",
    lineHeight: 1.6,
  } satisfies CSSProperties,

  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1.75rem",
    padding: "0.5rem 0",
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    fontSize: "0.6875rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: theme.colors.evergladeMuted,
    textDecoration: "none",
    border: "none",
    background: "none",
    cursor: "pointer",
    transition: "color 0.2s ease, opacity 0.2s ease",
  } satisfies CSSProperties,
} as const;
