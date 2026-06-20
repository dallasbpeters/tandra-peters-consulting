import { Phone } from "iconoir-react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useIsMobile } from "../hooks/is-mobile";
import {
  CONTACT_BANNER_DEFAULT_PHONE_DISPLAY,
  CONTACT_BANNER_DEFAULT_PHONE_TEL,
  CONTACT_BANNER_FREE_INSPECTION,
} from "../lib/contact-banner-presets";

import "../styles/contact-banner.css";
import { mix, theme } from "../theme";

const isInternalAppHref = (href: string) =>
  href.startsWith("/") && !href.startsWith("//");

const firstDefined = (...values: (string | undefined)[]): string | undefined =>
  values.find((value) => value !== undefined);

interface ContactBannerPalette {
  accentGlow: string;
  cardBackground: string;
  eyebrow: string;
  gridColor: string;
  phoneIconBackground: string;
  phoneIconForeground: string;
  phoneIconHoverBackground: string;
  phoneLabelColor: string;
  phoneLinkBackground: string;
  phoneLinkHoverBackground: string;
  phoneLinkHoverLabelColor: string;
  phoneLinkHoverOutline: string;
  phoneLinkHoverShadow: string;
  phoneLinkHoverTextColor: string;
  phoneLinkLabelColor: string;
  phoneLinkTextColor: string;
  pulse: string;
  pulsePing: string;
  text: string;
}

interface ContactBannerProps {
  accentGlowColor?: string;
  ariaLabel?: string;
  backgroundColor?: string;
  className?: string;
  ctaIcon?: ComponentType<{
    height: number;
    strokeWidth: number;
    width: number;
  }>;
  eyebrow?: string;
  eyebrowColor?: string;
  eyebrowColorLight?: string;
  gridColor?: string;
  headline?: string;
  iconColor?: string;
  iconColorDark?: string;
  iconColorLight?: string;
  iconColorVeryDark?: string;
  phoneAriaLabel?: string;
  phoneDisplay?: string;
  phoneHref?: string;
  phoneIconBackground?: string;
  phoneIconHoverBackground?: string;
  phoneLabel?: string;
  phoneLinkBackground?: string;
  phoneLinkHoverBackground?: string;
  phoneLinkHoverLabelColor?: string;
  phoneLinkHoverOutline?: string;
  phoneLinkHoverShadow?: string;
  phoneLinkHoverTextColor?: string;
  phoneTel?: string;
  pulseColor?: string;
  pulsePingColor?: string;
  textColor?: string;
}

const resolvePalette = ({
  backgroundColor,
  textColor,
  eyebrowColor,
  eyebrowColorLight,
  accentGlowColor,
  iconColor,
  iconColorDark,
  iconColorVeryDark,
  phoneLinkBackground,
  phoneLinkHoverBackground,
  phoneLinkHoverShadow,
  phoneLinkHoverOutline,
  phoneLinkHoverTextColor,
  phoneLinkHoverLabelColor,
  phoneIconBackground,
  phoneIconHoverBackground,
  pulseColor,
  pulsePingColor,
  iconColorLight,
  gridColor,
}: ContactBannerProps): ContactBannerPalette => {
  const resolvedText =
    firstDefined(textColor, theme.colors.white) ?? theme.colors.white;
  const resolvedLabel =
    firstDefined(iconColorLight, textColor, theme.colors.white) ??
    theme.colors.white;

  return {
    accentGlow:
      firstDefined(accentGlowColor, theme.palette.accent["300"]) ??
      theme.palette.accent["300"],
    cardBackground:
      firstDefined(backgroundColor, theme.colors.black) ?? theme.colors.black,
    eyebrow:
      firstDefined(eyebrowColor, theme.palette.everglade["500"]) ??
      theme.palette.everglade["500"],
    gridColor:
      firstDefined(gridColor, mix(resolvedText, 5)) ?? mix(resolvedText, 5),
    phoneIconBackground:
      firstDefined(
        phoneIconBackground,
        iconColorVeryDark,
        iconColorDark,
        theme.palette.everglade["700"]
      ) ?? theme.palette.everglade["700"],
    phoneIconForeground:
      firstDefined(iconColor, theme.colors.white) ?? theme.colors.white,
    phoneIconHoverBackground:
      firstDefined(phoneIconHoverBackground, theme.palette.accent["500"]) ??
      theme.palette.accent["500"],
    phoneLabelColor: resolvedLabel,
    phoneLinkBackground:
      firstDefined(phoneLinkBackground, mix(theme.colors.everglade, 40)) ??
      mix(theme.colors.everglade, 40),
    phoneLinkHoverBackground:
      firstDefined(phoneLinkHoverBackground, mix(theme.colors.black, 60)) ??
      mix(theme.colors.black, 60),
    phoneLinkHoverLabelColor:
      firstDefined(phoneLinkHoverLabelColor, resolvedLabel) ?? resolvedLabel,
    phoneLinkHoverOutline:
      firstDefined(
        phoneLinkHoverOutline,
        accentGlowColor,
        theme.palette.accent["300"]
      ) ?? theme.palette.accent["300"],
    phoneLinkHoverShadow:
      firstDefined(phoneLinkHoverShadow, mix(resolvedText, 15)) ??
      mix(resolvedText, 15),
    phoneLinkHoverTextColor:
      firstDefined(phoneLinkHoverTextColor, resolvedText) ?? resolvedText,
    phoneLinkLabelColor: resolvedLabel,
    phoneLinkTextColor: resolvedText,
    pulse:
      firstDefined(pulseColor, iconColorDark, theme.palette.everglade["700"]) ??
      theme.palette.everglade["700"],
    pulsePing:
      firstDefined(
        pulsePingColor,
        eyebrowColorLight,
        mix(theme.palette.accent["500"], 75)
      ) ?? mix(theme.palette.accent["500"], 75),
    text: resolvedText,
  };
};

const buildStyles = (palette: ContactBannerPalette, isMobile: boolean) =>
  ({
    banner: {
      borderRadius: `calc(${theme.radius.large} - ${theme.spacing.sm})`,
      color: palette.text,
      height: isMobile ? "auto" : 130,
      overflow: "hidden",
      padding: `${theme.spacing.md} ${isMobile ? theme.spacing.md : theme.spacing.xl}`,
      position: "relative",
    },
    brandCluster: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing.xl,
      minWidth: 0,
      position: "relative",
      width: isMobile ? "100%" : undefined,
      zIndex: 1,
    },
    card: {
      backgroundColor: palette.cardBackground,
      boxShadow: theme.shadow.md,
      padding: theme.spacing.md,
    },
    copyStack: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    eyebrowRow: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    eyebrowText: {
      color: palette.eyebrow,
      fontFamily: theme.fonts.headline,
      fontSize: "0.75rem",
      fontWeight: 700,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
    },
    headline: {
      color: palette.text,
      fontFamily: theme.fonts.headline,
      fontSize: isMobile ? "1.75rem" : "clamp(2rem, 3vw, 2.75rem)",
      fontWeight: 800,
      letterSpacing: "-0.02em",
      lineHeight: 1,
      margin: 0,
    },
    inner: {
      alignItems: "center",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? theme.spacing.md : theme.spacing.lg,
      height: "100%",
      justifyContent: isMobile ? "flex-start" : "space-between",
      position: "relative",
      width: isMobile ? "100%" : undefined,
      zIndex: 1,
    },
    phoneCopyStack: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    phoneIconCircle: {
      alignItems: "center",
      backgroundColor: palette.phoneIconBackground,
      borderRadius: "50%",
      color: palette.phoneIconForeground,
      display: "flex",
      flexShrink: 0,
      justifyContent: "center",
      transition: "transform 0.3s ease, background-color 0.3s ease",
    },
    phoneLabel: {
      fontFamily: theme.fonts.body,
      fontSize: "0.9375rem",
      fontWeight: 500,
    },
    phoneLabelRow: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.micro,
    },
    phoneLink: {
      alignItems: "center",
      backdropFilter: "blur(16px)",
      background: palette.phoneLinkBackground,
      border: `1px solid ${mix(palette.text, 10)}`,
      borderRadius: theme.radius.pill,
      color: "inherit",
      display: "flex",
      flexShrink: 0,
      gap: theme.spacing.lg,
      justifyContent: isMobile ? "flex-start" : undefined,
      maxWidth: isMobile ? "100%" : undefined,
      padding: isMobile
        ? `${theme.spacing.sm} ${theme.spacing.md}`
        : `${theme.spacing.md} ${theme.spacing.xxxxl} ${theme.spacing.md} ${theme.spacing.md}`,
      position: "relative",
      textDecoration: "none",
      transition:
        "background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease",
      width: isMobile ? "100%" : undefined,
      zIndex: 1,
    },
    phoneNumber: {
      fontFamily: theme.fonts.headline,
      fontSize: "clamp(1.125rem, 2.5vw, 1.65rem)",
      fontWeight: 800,
      letterSpacing: "0.04em",
      lineHeight: 1.1,
    },
  }) as const;

export const ContactBanner = ({
  eyebrow = CONTACT_BANNER_FREE_INSPECTION.eyebrow,
  headline = CONTACT_BANNER_FREE_INSPECTION.headline,
  phoneLabel = CONTACT_BANNER_FREE_INSPECTION.phoneLabel,
  phoneDisplay = CONTACT_BANNER_DEFAULT_PHONE_DISPLAY,
  phoneTel = CONTACT_BANNER_DEFAULT_PHONE_TEL,
  phoneHref,
  ctaIcon: CtaIcon = Phone,
  ariaLabel = CONTACT_BANNER_FREE_INSPECTION.ariaLabel,
  phoneAriaLabel,
  className,
  backgroundColor,
  textColor,
  eyebrowColor,
  eyebrowColorLight,
  accentGlowColor,
  iconColor,
  iconColorLight,
  iconColorDark,
  iconColorVeryDark,
  phoneLinkBackground,
  phoneLinkHoverBackground,
  phoneLinkHoverShadow,
  phoneLinkHoverOutline,
  phoneLinkHoverTextColor,
  phoneLinkHoverLabelColor,
  phoneIconBackground,
  phoneIconHoverBackground,
  pulseColor,
  pulsePingColor,
  gridColor,
}: ContactBannerProps) => {
  const isMobile = useIsMobile(768);
  const phoneCircleSize = isMobile ? 48 : 60;
  const palette = useMemo(
    () =>
      resolvePalette({
        accentGlowColor,
        backgroundColor,
        eyebrowColor,
        eyebrowColorLight,
        gridColor,
        iconColor,
        iconColorDark,
        iconColorLight,
        iconColorVeryDark,
        phoneIconBackground,
        phoneIconHoverBackground,
        phoneLinkBackground,
        phoneLinkHoverBackground,
        phoneLinkHoverLabelColor,
        phoneLinkHoverOutline,
        phoneLinkHoverShadow,
        phoneLinkHoverTextColor,
        pulseColor,
        pulsePingColor,
        textColor,
      }),
    [
      backgroundColor,
      textColor,
      eyebrowColor,
      eyebrowColorLight,
      accentGlowColor,
      iconColor,
      iconColorLight,
      iconColorDark,
      iconColorVeryDark,
      phoneLinkBackground,
      phoneLinkHoverBackground,
      phoneLinkHoverShadow,
      phoneLinkHoverOutline,
      phoneLinkHoverTextColor,
      phoneLinkHoverLabelColor,
      phoneIconBackground,
      phoneIconHoverBackground,
      pulseColor,
      pulsePingColor,
      gridColor,
    ]
  );
  const styles = useMemo(
    () => buildStyles(palette, isMobile),
    [palette, isMobile]
  );
  const themeVars = useMemo((): CSSProperties => {
    const vars: Record<string, string> = {
      "--contact-banner-accent-glow": mix(palette.accentGlow, 20),
      "--contact-banner-grid-color": palette.gridColor,
      "--contact-banner-icon-hover-bg": palette.phoneIconHoverBackground,
      "--contact-banner-pulse": palette.pulse,
      "--contact-banner-pulse-ping": palette.pulsePing,
    };
    return vars as CSSProperties;
  }, [palette]);
  const ctaThemeVars = useMemo((): CSSProperties => {
    const vars: Record<string, string> = {
      "--contact-banner-cta-focus": palette.phoneLinkHoverOutline,
      "--contact-banner-cta-hover-bg": palette.phoneLinkHoverBackground,
      "--contact-banner-cta-hover-label-color":
        palette.phoneLinkHoverLabelColor,
      "--contact-banner-cta-hover-shadow": palette.phoneLinkHoverShadow,
      "--contact-banner-cta-hover-text-color": palette.phoneLinkHoverTextColor,
      "--contact-banner-cta-label-color": palette.phoneLinkLabelColor,
      "--contact-banner-cta-text-color": palette.phoneLinkTextColor,
    };
    return vars as CSSProperties;
  }, [palette]);
  const resolvedCtaHref = phoneHref ?? `tel:${phoneTel}`;
  const resolvedCtaAriaLabel = phoneAriaLabel ?? `Call or text ${phoneDisplay}`;
  const iconSize = isMobile ? 22 : 28;

  const ctaContent: ReactNode = (
    <>
      <span
        aria-hidden
        className="contact-banner__cta-icon"
        style={{
          ...styles.phoneIconCircle,
          height: phoneCircleSize,
          width: phoneCircleSize,
        }}
      >
        <CtaIcon height={iconSize} strokeWidth={1.75} width={iconSize} />
      </span>
      <span style={styles.phoneCopyStack}>
        <span style={styles.phoneLabelRow}>
          <span className="contact-banner__cta-label" style={styles.phoneLabel}>
            {phoneLabel}
          </span>
        </span>
        <span className="contact-banner__cta-text" style={styles.phoneNumber}>
          {phoneDisplay}
        </span>
      </span>
    </>
  );

  const sectionClassName = ["contact-banner", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      aria-label={ariaLabel}
      className={sectionClassName}
      style={{ ...styles.card, ...themeVars }}
    >
      <div className="contact-banner__grid" style={styles.banner}>
        <div style={styles.inner}>
          <div style={styles.brandCluster}>
            <div style={styles.copyStack}>
              <div style={styles.eyebrowRow}>
                <span aria-hidden className="contact-banner__pulse" />
                <span style={styles.eyebrowText}>{eyebrow}</span>
              </div>
              <h2 style={styles.headline}>{headline}</h2>
            </div>
          </div>

          {isInternalAppHref(resolvedCtaHref) ? (
            <Link
              aria-label={resolvedCtaAriaLabel}
              className="contact-banner__cta"
              style={{ ...styles.phoneLink, ...ctaThemeVars }}
              to={resolvedCtaHref}
            >
              {ctaContent}
            </Link>
          ) : (
            <a
              aria-label={resolvedCtaAriaLabel}
              className="contact-banner__cta"
              href={resolvedCtaHref}
              style={{ ...styles.phoneLink, ...ctaThemeVars }}
            >
              {ctaContent}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
