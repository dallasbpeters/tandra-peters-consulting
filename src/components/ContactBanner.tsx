import type { CSSProperties } from "react";

import { ChatLines, Phone, ShieldCheck } from "iconoir-react";

import { useIsMobile } from "../hooks/isMobile";
import { mix, theme } from "../theme";

const DEFAULT_PHONE_DISPLAY = "(512) 968-3965";
const DEFAULT_PHONE_TEL = "+15129683965";

type ContactBannerProps = {
  eyebrow?: string;
  headline?: string;
  phoneDisplay?: string;
  phoneTel?: string;
};

const brandGreen = theme.palette.everglade["700"];
const brandGreenLight = theme.palette.everglade["500"];
const ink = theme.colors.white;
const muted = theme.palette.granite["600"];
const accentGlow = theme.palette.accent["300"];

const styles = {
  card: (isMobile: boolean): CSSProperties => ({
    margin: isMobile ? theme.spacing.lg : theme.spacing.sectionLoose,
    marginTop: theme.spacing.xl,
    padding: isMobile ? theme.spacing.sm : theme.spacing.md,
    borderRadius: theme.radius.large,
    backgroundColor: "#000",
    boxShadow: theme.shadow.md,
  }),
  banner: (isMobile: boolean): CSSProperties => ({
    position: "relative",
    overflow: "hidden",
    height: 130,
    padding: `0 ${isMobile ? theme.spacing.md : theme.spacing.xl}`,
    borderRadius: `calc(${theme.radius.large} - ${theme.spacing.sm})`,
    color: ink,
  }),
  inner: (isMobile: boolean): CSSProperties => ({
    position: "relative",
    zIndex: 1,
    display: "flex",
    height: "100%",
    alignItems: "center",
    justifyContent: isMobile ? "center" : "space-between",
    flexDirection: isMobile ? "column" : "row",
    gap: isMobile ? theme.spacing.md : theme.spacing.lg,
  }),
  brandCluster: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xl,
  } satisfies CSSProperties,
  iconTile: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: theme.radius.large,
    background: `linear-gradient(145deg, ${brandGreenLight}, ${brandGreen})`,
    border: `1px solid ${mix(theme.colors.white, 20)}`,
    boxShadow: `0 0 40px -10px ${mix(brandGreen, 30)}`,
    transform: "rotate(-3deg)",
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
    color: brandGreenLight,
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
    color: ink,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  } satisfies CSSProperties,
  phoneLink: (isMobile: boolean): CSSProperties => ({
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
      : `${theme.spacing.md} ${theme.spacing.xl} ${theme.spacing.md} ${theme.spacing.md}`,
    background: mix(theme.colors.everglade, 40),
    backdropFilter: "blur(16px)",
    border: `1px solid ${mix(ink, 10)}`,
    transition: "background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease",
  }),
  phoneIconCircle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "50%",
    backgroundColor: brandGreen,
    color: theme.colors.white,
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
    color: muted,
    fontFamily: theme.fonts.body,
    fontWeight: 500,
    fontSize: "0.9375rem",
  } satisfies CSSProperties,
  phoneNumber: {
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    color: ink,
    letterSpacing: "0.04em",
    fontSize: "clamp(1.125rem, 2.5vw, 1.65rem)",
    lineHeight: 1.1,
  } satisfies CSSProperties,
} as const;

export const ContactBanner = ({
  eyebrow = "Zero Cost · No Obligation",
  headline = "Free Inspection",
  phoneDisplay = DEFAULT_PHONE_DISPLAY,
  phoneTel = DEFAULT_PHONE_TEL,
}: ContactBannerProps) => {
  const isMobile = useIsMobile(768);
  const iconSize = isMobile ? 56 : 72;
  const phoneCircleSize = isMobile ? 48 : 60;

  return (
    <section style={styles.card(isMobile)} aria-label="Schedule a free roof inspection">
      <style>{`
        .contact-banner-grid::before {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, ${mix(ink, 5)} 1px, transparent 1px),
            linear-gradient(to bottom, ${mix(ink, 5)} 1px, transparent 1px);
          background-size: 16px 16px;
          pointer-events: none;
          content: "";
        }
        .contact-banner-grid::after {
          position: absolute;
          top: -40%;
          left: 20%;
          width: min(500px, 70vw);
          height: min(500px, 70vw);
          border-radius: 50%;
          background: ${mix(accentGlow, 20)};
          filter: blur(120px);
          pointer-events: none;
          content: "";
        }

        .contact-banner-pulse {
          position: relative;
          display: inline-flex;
          width: 0.625rem;
          height: 0.625rem;
        }
        .contact-banner-pulse::before,
        .contact-banner-pulse::after {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          content: "";
        }
        .contact-banner-pulse::before {
          animation: contact-banner-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          background: ${mix(theme.palette.accent["500"], 75)};
        }
        .contact-banner-pulse::after {
          background: ${brandGreen};
        }
        @keyframes contact-banner-ping {
          75%, 100% { opacity: 0; transform: scale(2); }
        }
        .contact-banner-phone:hover,
        .contact-banner-phone:focus-visible {
          background: ${mix(theme.colors.black, 60)} !important;
          box-shadow: 0 8px 32px 0 ${mix(ink, 15)} !important;
          outline: 2px solid ${accentGlow};
          outline-offset: 3px;
        }
        .contact-banner-phone:hover .contact-banner-phone-icon,
        .contact-banner-phone:focus-visible .contact-banner-phone-icon {
          transform: scale(1.05);
          background-color: ${theme.palette.accent["500"]};
        }
      `}</style>

      <div className="contact-banner-grid" style={styles.banner(isMobile)}>
        <div style={styles.inner(isMobile)}>
          <div style={styles.brandCluster}>
            <div
              className="contact-banner-icon-shine"
              style={{
                ...styles.iconTile,
                width: iconSize,
                height: iconSize,
              }}
              aria-hidden
            >
              <ShieldCheck
                width={isMobile ? 28 : 36}
                height={isMobile ? 28 : 36}
                strokeWidth={1.75}
                color={theme.colors.white}
              />
            </div>

            <div style={styles.copyStack}>
              <div style={styles.eyebrowRow}>
                <span className="contact-banner-pulse" aria-hidden />
                <span style={styles.eyebrowText}>{eyebrow}</span>
              </div>
              <h2
                style={{
                  ...styles.headline,
                  fontSize: isMobile ? "1.75rem" : "clamp(2rem, 3vw, 2.75rem)",
                }}
              >
                {headline}
              </h2>
            </div>
          </div>

          <a
            className="contact-banner-phone"
            href={`tel:${phoneTel}`}
            style={styles.phoneLink(isMobile)}
            aria-label={`Call or text ${phoneDisplay}`}
          >
            <span
              className="contact-banner-phone-icon"
              style={{
                ...styles.phoneIconCircle,
                width: phoneCircleSize,
                height: phoneCircleSize,
              }}
              aria-hidden
            >
              <Phone width={isMobile ? 22 : 28} height={isMobile ? 22 : 28} strokeWidth={1.75} />
            </span>
            <span style={styles.phoneCopyStack}>
              <span style={styles.phoneLabelRow}>
                <span style={styles.phoneLabel}>Call or text</span>
                <ChatLines
                  width={18}
                  height={18}
                  strokeWidth={1.75}
                  color={brandGreenLight}
                  aria-hidden
                />
              </span>
              <span style={styles.phoneNumber}>{phoneDisplay}</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};
