/**
 * OKLCH scales + semantic tokens used across the app.
 * Use `theme.colors.*` in components; use `theme.palette` when you need a specific step.
 * For translucent overlays/borders with non-hex colors, use `mix(color, percent)`.
 */
export const mix = (color: string, opacityPercent: number) =>
  `color-mix(in oklch, ${color} ${opacityPercent}%, transparent)`;

const palette = {
  accent: {
    "100": "oklch(93.30% 0.024 139.44)",
    "200": "oklch(86.73% 0.051 138.85)",
    "300": "oklch(79.97% 0.076 139.06)",
    "400": "oklch(73.42% 0.104 138.95)",
    "50": "oklch(96.64% 0.012 137.78)",
    "500": "oklch(66.71% 0.128 139.18)",
    "600": "oklch(56.84% 0.108 139.09)",
    "700": "oklch(46.26% 0.084 139.21)",
    "800": "oklch(35.31% 0.061 139.03)",
    "900": "oklch(23.14% 0.033 139.46)",
    "950": "oklch(19.26% 0.025 137.38)",
  },
  blue: {
    "100": "oklch(88.18% 0.058 274.39)",
    "200": "oklch(76.45% 0.120 272.81)",
    "300": "oklch(65.41% 0.184 269.97)",
    "400": "oklch(55.50% 0.245 266.68)",
    "50": "oklch(94.15% 0.028 272.51)",
    "500": "oklch(48.49% 0.291 264.12)",
    "600": "oklch(41.26% 0.244 264.08)",
    "700": "oklch(33.73% 0.195 263.98)",
    "800": "oklch(25.63% 0.143 263.79)",
    "900": "oklch(17.14% 0.083 262.60)",
    "950": "oklch(14.44% 0.064 261.40)",
  },
  coral: {
    "100": "oklch(91.13% 0.045 36.72)",
    "200": "oklch(82.55% 0.096 35.89)",
    "300": "oklch(74.98% 0.147 36.45)",
    "400": "oklch(68.72% 0.196 36.21)",
    "50": "oklch(95.38% 0.022 35.12)",
    "500": "oklch(64.27% 0.232 33.50)",
    "600": "oklch(54.55% 0.194 33.93)",
    "700": "oklch(44.30% 0.155 34.40)",
    "800": "oklch(33.44% 0.113 35.39)",
    "900": "oklch(21.83% 0.066 39.88)",
    "950": "oklch(17.99% 0.050 41.79)",
  },
  everglade: {
    "100": "oklch(94.59% 0.038 169.76)",
    "200": "oklch(59.31% 0.073 168.54)",
    "300": "oklch(84.57% 0.107 167.22)",
    "400": "oklch(80.06% 0.134 164.84)",
    "50": "oklch(97.16% 0.019 171.52)",
    "500": "oklch(76.29% 0.157 161.60)",
    "600": "oklch(64.58% 0.131 162.02)",
    "700": "oklch(52.58% 0.105 162.36)",
    "800": "oklch(39.54% 0.077 162.53)",
    "900": "oklch(25.66% 0.046 163.60)",
    "950": "oklch(20.94% 0.034 164.20)",
  },
  gold: {
    "100": "oklch(98% 0.022 88.6)",
    "200": "oklch(96.1% 0.044 89.7)",
    "300": "oklch(94.1% 0.065 90.7)",
    "400": "oklch(92.2% 0.086 91.7)",
    "500": "oklch(90.2% 0.105 92.6)",
    "600": "oklch(88.3% 0.123 93.5)",
    "700": "oklch(86.4% 0.139 94.3)",
    "800": "oklch(84.5% 0.154 95)",
    "900": "oklch(82.6% 0.166 95.6)",
  },
  granite: {
    "100": "oklch(93.04% 0.013 167.16)",
    "200": "oklch(85.99% 0.027 166.66)",
    "300": "oklch(78.85% 0.041 166.03)",
    "400": "oklch(71.45% 0.054 164.17)",
    "50": "oklch(96.55% 0.007 160.08)",
    "500": "oklch(64.16% 0.068 163.32)",
    "600": "oklch(54.58% 0.057 163.19)",
    "700": "oklch(44.80% 0.046 164.31)",
    "800": "oklch(34.20% 0.033 164.55)",
    "900": "oklch(22.68% 0.018 165.08)",
    "950": "oklch(19.05% 0.015 162.96)",
  },
  paper: {
    "100": "oklch(93.21% 0.009 106.58)",
    "200": "oklch(86.04% 0.016 106.74)",
    "300": "oklch(79% 0.026 106.98)",
    "400": "oklch(71.53% 0.034 107.22)",
    "50": "oklch(96.63% 0.004 106.47)",
    "500": "oklch(64.16% 0.044 107.58)",
    "600": "oklch(54.53% 0.036 107.53)",
    "700": "oklch(44.75% 0.030 107.54)",
    "800": "oklch(34.07% 0.020 107.42)",
    "900": "oklch(22.82% 0.013 107.39)",
    "950": "oklch(18.97% 0.008 107.13)",
  },
  paperLight: {
    "100": "oklch(92.71% 0.004 106.48)",
    "200": "oklch(85.28% 0.008 106.57)",
    "300": "oklch(77.69% 0.013 106.69)",
    "400": "oklch(69.90% 0.017 106.83)",
    "50": "oklch(96.36% 0.003 106.45)",
    "500": "oklch(61.90% 0.022 107.02)",
    "600": "oklch(52.76% 0.018 107.01)",
    "700": "oklch(43.20% 0.014 106.99)",
    "800": "oklch(33.08% 0.010 106.95)",
    "900": "oklch(22.10% 0.006 106.86)",
    "950": "oklch(18.59% 0.004 106.78)",
  },
  purple: {
    "100": "oklch(86.37% 0.070 286.62)",
    "200": "oklch(72.81% 0.146 283.49)",
    "300": "oklch(60.15% 0.220 278.91)",
    "400": "oklch(50.06% 0.281 271.32)",
    "50": "oklch(93.05% 0.035 287.46)",
    "500": "oklch(45.31% 0.312 264.58)",
    "600": "oklch(38.34% 0.264 264.81)",
    "700": "oklch(31.02% 0.213 265.08)",
    "800": "oklch(23.22% 0.159 265.52)",
    "900": "oklch(14.78% 0.099 267.86)",
    "950": "oklch(11.97% 0.080 267.63)",
  },
} as const;

const shadow = {
  lg: "0.3px 0.5px 0.7px hsl(60deg 12% 66% / 27%), 1.3px 2.6px 3.3px -0.3px hsl(60deg 12% 66% / 27%), 2.4px 4.7px 6px -0.7px hsl(60deg 12% 66% / 27%), 3.8px 7.6px 9.7px -1px hsl(60deg 12% 66% / 27%), 6px 12.1px 15.4px -1.4px hsl(60deg 12% 66% / 28%), 9.4px 18.7px 23.9px -1.7px hsl(60deg 12% 66% / 28%), 14.1px 28.3px 36px -2.1px hsl(60deg 12% 66% / 28%), 20.8px 41.5px 52.9px -2.4px hsl(60deg 12% 66% / 28%)",
  md: "0.3px 0.5px 0.7px hsl(60deg 12% 66% / 29%), 0.8px 1.6px 2px -0.8px hsl(60deg 12% 66% / 29%), 1.9px 3.8px 4.8px -1.6px hsl(60deg 12% 66% / 30%), 4.6px 9.2px 11.7px -2.4px hsl(60deg 12% 66% / 30%)",
  sm: "0.3px 0.5px 0.7px hsl(60deg 12% 66% / 27%), 0.4px 0.8px 1px -1.2px hsl(60deg 12% 66% / 28%), 0.9px 1.8px 2.3px -2.4px hsl(60deg 12% 66% / 29%)",
} as const;

/** CSS mirrors (colors, palette, radius, spacing, shadow): `pnpm generate:theme-css` → `src/styles/theme-variables.css` */
const radius = {
  large: "1rem",
  medium: "0.5rem",
  pill: "9999px",
  small: "0.25rem",
  xlarge: "1.5rem",
  xxlarge: "2rem",
  xxxlarge: "2.5rem",
  xxxxlarge: "3rem",
  xxxxxlarge: "3.5rem",
  xxxxxxxlarge: "4rem",
} as const;

const typography = {
  size100: "1rem",
  size200: "1.2rem",
  size300: "1.44rem",
  size400: "1.728rem",
  size500: "2.074rem",
  size600: "2.488rem",
  size700: "2.986rem",
  size80: "0.694rem",
  size90: "0.833rem",
} as const;

const spacing = {
  buttonPadY: "0.5625rem",
  buttonPadYLg: "0.9375rem",
  /** Between sm and md (10px) */
  compact: "0.625rem",
  /** Between md and lg (14px) */
  cozy: "0.875rem",
  hairline: "0.125rem",
  /** Nav pill / glass horizontal inset */
  insetXl: "1.375rem",
  lg: "1rem",
  md: "0.75rem",
  micro: "0.15rem",
  /** Mobile hero top inset — clears fixed nav */
  navClearance: "7.5rem",
  nudge: "0.2rem",
  /** Section padding / vertical rhythm */
  section: "4rem",
  sectionHero: "8rem",
  sectionInsetTop: "6.5rem",
  sectionLoose: "5rem",
  sectionWide: "6rem",
  sm: "0.5rem",
  stackPad: "1.125rem",
  /** Between sm and md */
  tight: "0.375rem",
  xl: "1.25rem",
  xs: "0.25rem",
  xxl: "1.5rem",
  xxxl: "1.75rem",
  xxxxl: "2rem",
  xxxxxl: "2.25rem",
  xxxxxxl: "2.5rem",
  xxxxxxxl: "2.75rem",
  xxxxxxxxl: "3rem",
  xxxxxxxxxl: "3.25rem",
  xxxxxxxxxxl: "3.5rem",
} as const;

export const theme = {
  colors: {
    accent: palette.accent["500"],
    accentLight: palette.accent["300"],
    black: palette.paper["950"],
    danger: palette.coral["600"],
    everglade: palette.everglade["900"],
    evergladeLight: palette.everglade["800"],
    /** Secondary text on light surfaces (paper, cards). */
    evergladeMuted: palette.everglade["200"],
    /** Second line of the hero title (default + CMS); tune via `palette.purple` steps. */
    heroAccent: palette.purple["200"],
    /** Small print on legal pages (replaces ad-hoc #666). Uses granite.700 to clear WCAG AA body contrast on `paper`/`paper-dim` surfaces. */
    legalMuted: palette.granite["700"],
    paper: palette.paper["50"],
    paperDark: palette.paper["200"],
    paperDim: palette.paperLight["100"],
    purple: palette.purple["100"],
    /** Muted / supporting text on dark everglade sections (footer, testimonials, etc.). */
    textOnBrand: palette.everglade["100"],
    white: "oklch(100% 0 0)",
  },
  fonts: {
    body: '"Hanken Grotesk Variable", sans-serif',
    headline: '"Hanken Grotesk Variable", sans-serif',
    headlineAlt: '"IBM Plex Serif", serif',
    special: '"Bebas Neue", sans-serif',
  },
  palette,
  radius,
  shadow,
  spacing,
  typography,
};
