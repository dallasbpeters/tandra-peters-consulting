import type { CSSProperties } from "react";

import { mix, theme } from "../theme";

/**
 * Repeated type + color recipes (theme-aware). Pair with `layoutClasses` for shells.
 */
export const typeStyles = {
  articleDetailTitle: {
    color: theme.colors.everglade,

    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(1.75rem, 4vw, 2.35rem)",
    fontWeight: 600,
    letterSpacing: "0.01em",
    lineHeight: 1.2,
    marginBottom: theme.spacing.md,
  } satisfies CSSProperties,

  backLink: {
    alignItems: "center",
    background: "none",
    border: "none",
    color: theme.colors.everglade,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: theme.fonts.headline,
    fontSize: "0.6875rem",
    fontWeight: 800,
    gap: theme.spacing.sm,
    letterSpacing: "0.16em",
    marginBottom: theme.spacing.xxxl,
    padding: `${theme.spacing.sm} 0`,
    textDecoration: "none",
    textTransform: "uppercase",
    transition: "color 0.2s ease, opacity 0.2s ease",
  } satisfies CSSProperties,

  legalBody: {
    color: theme.colors.everglade,

    fontFamily: theme.fonts.body,
    fontSize: "1rem",
    lineHeight: 1.7,
  } satisfies CSSProperties,

  legalMuted: {
    color: theme.colors.everglade,
    fontSize: "0.875rem",
    lineHeight: 1.6,

    marginBottom: theme.spacing.xxxxl,
  } satisfies CSSProperties,

  legalPageTitle: {
    color: theme.colors.everglade,

    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
    fontWeight: 600,
    letterSpacing: "0.01em",
    lineHeight: 1.15,
    marginBottom: theme.spacing.xxxxl,
  } satisfies CSSProperties,

  pageListIntro: {
    color: mix(theme.colors.everglade, 80),
    fontSize: "1.05rem",
    lineHeight: 1.65,
    marginBottom: theme.spacing.xxxxxxl,
    maxWidth: "42rem",
  } satisfies CSSProperties,

  pageListTitle: {
    color: theme.colors.everglade,

    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(2rem, 5vw, 2.75rem)",
    fontWeight: 400,
    lineHeight: 1.15,
    marginBottom: theme.spacing.md,
  } satisfies CSSProperties,
} as const;
