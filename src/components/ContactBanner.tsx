import { Phone } from "iconoir-react";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { useIsMobile } from "../hooks/isMobile";
import {
  CONTACT_BANNER_DEFAULT_PHONE_DISPLAY,
  CONTACT_BANNER_DEFAULT_PHONE_TEL,
  CONTACT_BANNER_FREE_INSPECTION,
  type ContactBannerProps,
} from "../lib/contactBannerPresets";
import "../styles/contact-banner.css";
import { mix, theme } from "../theme";

const isInternalAppHref = (href: string) => href.startsWith("/") && !href.startsWith("//");

type ContactBannerPalette = {
  cardBackground: string;
  text: string;
  eyebrow: string;
  pulse: string;
  pulsePing: string;
  accentGlow: string;
  phoneLinkBackground: string;
  phoneLinkHoverBackground: string;
  phoneLinkHoverShadow: string;
  phoneLinkHoverOutline: string;
  phoneLinkHoverTextColor: string;
  phoneLinkHoverLabelColor: string;
  phoneLinkTextColor: string;
  phoneLinkLabelColor: string;
  phoneIconBackground: string;
  phoneIconHoverBackground: string;
  phoneIconForeground: string;
  phoneLabelColor: string;
  gridColor: string;
};

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
  const resolvedText = textColor ?? theme.colors.white;
  const resolvedLabel = iconColorLight ?? textColor ?? theme.colors.white;

  return {
    cardBackground: backgroundColor ?? theme.colors.black,
    text: textColor ?? theme.colors.white,
    eyebrow: eyebrowColor ?? theme.palette.everglade["500"],
    pulse: pulseColor ?? iconColorDark ?? theme.palette.everglade["700"],
    pulsePing: pulsePingColor ?? eyebrowColorLight ?? mix(theme.palette.accent["500"], 75),
    accentGlow: accentGlowColor ?? theme.palette.accent["300"],
    phoneLinkBackground: phoneLinkBackground ?? mix(theme.colors.everglade, 40),
    phoneLinkHoverBackground: phoneLinkHoverBackground ?? mix(theme.colors.black, 60),
    phoneLinkHoverShadow: phoneLinkHoverShadow ?? mix(textColor ?? theme.colors.white, 15),
    phoneLinkHoverOutline: phoneLinkHoverOutline ?? accentGlowColor ?? theme.palette.accent["300"],
    phoneLinkTextColor: resolvedText,
    phoneLinkLabelColor: resolvedLabel,
    phoneLinkHoverTextColor: phoneLinkHoverTextColor ?? resolvedText,
    phoneLinkHoverLabelColor: phoneLinkHoverLabelColor ?? resolvedLabel,
    phoneIconBackground:
      phoneIconBackground ?? iconColorVeryDark ?? iconColorDark ?? theme.palette.everglade["700"],
    phoneIconHoverBackground: phoneIconHoverBackground ?? theme.palette.accent["500"],
    phoneIconForeground: iconColor ?? theme.colors.white,
    phoneLabelColor: iconColorLight ?? textColor ?? theme.colors.white,
    gridColor: gridColor ?? mix(resolvedText, 5),
  };
};

const buildStyles = (palette: ContactBannerPalette, isMobile: boolean) =>
  ({
    card: {
      margin: isMobile ? theme.spacing.lg : theme.spacing.section,
      marginTop: theme.spacing.xl,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.large,
      backgroundColor: palette.cardBackground,
      boxShadow: theme.shadow.md,
    } satisfies CSSProperties,
    banner: {
      position: "relative",
      overflow: "hidden",
      height: isMobile ? "auto" : 130,
      padding: `${theme.spacing.md} ${isMobile ? theme.spacing.md : theme.spacing.xl}`,
      borderRadius: `calc(${theme.radius.large} - ${theme.spacing.sm})`,
      color: palette.text,
    } satisfies CSSProperties,
    inner: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: isMobile ? "flex-start" : "space-between",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? theme.spacing.md : theme.spacing.lg,
    } satisfies CSSProperties,
    brandCluster: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      width: isMobile ? "100%" : undefined,
      minWidth: 0,
      gap: theme.spacing.xl,
    } satisfies CSSProperties,
    copyStack: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    } satisfies CSSProperties,
    eyebrowRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    } satisfies CSSProperties,
    eyebrowText: {
      color: palette.eyebrow,
      fontFamily: theme.fonts.headline,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      fontSize: "0.75rem",
    } satisfies CSSProperties,
    headline: {
      margin: 0,
      fontFamily: theme.fonts.headline,
      fontWeight: 800,
      color: palette.text,
      letterSpacing: "-0.02em",
      lineHeight: 1,
      fontSize: isMobile ? "1.75rem" : "clamp(2rem, 3vw, 2.75rem)",
    } satisfies CSSProperties,
    phoneLink: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.lg,
      flexShrink: 0,
      width: isMobile ? "100%" : undefined,
      maxWidth: isMobile ? "100%" : undefined,
      justifyContent: isMobile ? "flex-start" : undefined,
      textDecoration: "none",
      color: "inherit",
      borderRadius: theme.radius.pill,
      padding: isMobile
        ? `${theme.spacing.sm} ${theme.spacing.md}`
        : `${theme.spacing.md} ${theme.spacing.xxxxl} ${theme.spacing.md} ${theme.spacing.md}`,
      background: palette.phoneLinkBackground,
      backdropFilter: "blur(16px)",
      border: `1px solid ${mix(palette.text, 10)}`,
      transition: "background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease",
    } satisfies CSSProperties,
    phoneIconCircle: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      borderRadius: "50%",
      backgroundColor: palette.phoneIconBackground,
      color: palette.phoneIconForeground,
      transition: "transform 0.3s ease, background-color 0.3s ease",
    } satisfies CSSProperties,
    phoneCopyStack: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    } satisfies CSSProperties,
    phoneLabelRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.micro,
    } satisfies CSSProperties,
    phoneLabel: {
      fontFamily: theme.fonts.body,
      fontWeight: 500,
      fontSize: "0.9375rem",
    } satisfies CSSProperties,
    phoneNumber: {
      fontFamily: theme.fonts.headline,
      fontWeight: 800,
      letterSpacing: "0.04em",
      fontSize: "clamp(1.125rem, 2.5vw, 1.65rem)",
      lineHeight: 1.1,
    } satisfies CSSProperties,
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
    ],
  );
  const styles = useMemo(() => buildStyles(palette, isMobile), [palette, isMobile]);
  const themeVars = useMemo((): CSSProperties => {
    const vars: Record<string, string> = {
      "--contact-banner-grid-color": palette.gridColor,
      "--contact-banner-accent-glow": mix(palette.accentGlow, 20),
      "--contact-banner-pulse-ping": palette.pulsePing,
      "--contact-banner-pulse": palette.pulse,
      "--contact-banner-icon-hover-bg": palette.phoneIconHoverBackground,
    };
    return vars as CSSProperties;
  }, [palette]);
  const ctaThemeVars = useMemo((): CSSProperties => {
    const vars: Record<string, string> = {
      "--contact-banner-cta-label-color": palette.phoneLinkLabelColor,
      "--contact-banner-cta-text-color": palette.phoneLinkTextColor,
      "--contact-banner-cta-hover-bg": palette.phoneLinkHoverBackground,
      "--contact-banner-cta-hover-shadow": palette.phoneLinkHoverShadow,
      "--contact-banner-cta-focus": palette.phoneLinkHoverOutline,
      "--contact-banner-cta-hover-label-color": palette.phoneLinkHoverLabelColor,
      "--contact-banner-cta-hover-text-color": palette.phoneLinkHoverTextColor,
    };
    return vars as CSSProperties;
  }, [palette]);
  const resolvedCtaHref = phoneHref ?? `tel:${phoneTel}`;
  const resolvedCtaAriaLabel = phoneAriaLabel ?? `Call or text ${phoneDisplay}`;
  const iconSize = isMobile ? 22 : 28;

  const ctaContent: ReactNode = (
    <>
      <span
        className="contact-banner__cta-icon"
        style={{
          ...styles.phoneIconCircle,
          width: phoneCircleSize,
          height: phoneCircleSize,
        }}
        aria-hidden
      >
        <CtaIcon width={iconSize} height={iconSize} strokeWidth={1.75} />
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

  const sectionClassName = ["contact-banner", className].filter(Boolean).join(" ");

  return (
    <section
      className={sectionClassName}
      style={{ ...styles.card, ...themeVars }}
      aria-label={ariaLabel}
    >
      <div className="contact-banner__grid" style={styles.banner}>
        <div style={styles.inner}>
          <div style={styles.brandCluster}>
            <div style={styles.copyStack}>
              <div style={styles.eyebrowRow}>
                <span className="contact-banner__pulse" aria-hidden />
                <span style={styles.eyebrowText}>{eyebrow}</span>
              </div>
              <h2 style={styles.headline}>{headline}</h2>
            </div>
          </div>

          {isInternalAppHref(resolvedCtaHref) ? (
            <Link
              className="contact-banner__cta"
              to={resolvedCtaHref}
              style={{ ...styles.phoneLink, ...ctaThemeVars }}
              aria-label={resolvedCtaAriaLabel}
            >
              {ctaContent}
            </Link>
          ) : (
            <a
              className="contact-banner__cta"
              href={resolvedCtaHref}
              style={{ ...styles.phoneLink, ...ctaThemeVars }}
              aria-label={resolvedCtaAriaLabel}
            >
              {ctaContent}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
