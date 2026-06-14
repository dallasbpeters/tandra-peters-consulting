import { usePostHog } from "@posthog/react";
import { Facebook, Linkedin, Twitter, Mail, Link } from "iconoir-react";
import React, { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useIsMobile } from "../hooks/isMobile";
import { plainTextFromRich } from "../portableText/plainText";
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import { SocialShareBarProps } from "../types";
import { buildSharePageUrl } from "../utils/siteUrl";

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  heading = "Know someone who needs roofing help?",
  shareText = "Tandra Peters | Birdcreek Roofing consultant in Austin — assessments, insurance help, trusted installation",
}) => {
  const [copied, setCopied] = useState(false);
  const posthog = usePostHog();
  const isMobile = useIsMobile();
  const { pathname, search, hash } = useLocation();

  const pageUrl = useMemo(
    () => buildSharePageUrl(pathname, search, hash),
    [pathname, search, hash],
  );

  const sharePlain = useMemo(() => {
    try {
      return plainTextFromRich(shareText);
    } catch {
      return "";
    }
  }, [shareText]);

  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(sharePlain);

  /**
   * Facebook killed direct web→native-app share deep links (`fb://` sharing is
   * gone; `sharer.php`/`dialog/share` are web pages that just open in Safari).
   * The only reliable way to hand the link to the installed Facebook app on
   * iOS is the Web Share API: it opens the native share sheet, and tapping
   * Facebook launches the app's composer. `sharer.php` stays as the href so
   * desktop (and any browser without Web Share) still gets the popup.
   */
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterHref = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(sharePlain)}&body=${encodeURIComponent(`${sharePlain}\n\n${pageUrl}`)}`;
  const nextdoorHref = `https://nextdoor.com/sharekit/?source=tandra.me&body=${encodeURIComponent(`Check out ${sharePlain} ${pageUrl}`)}hashtag=roofing`;

  const canWebShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleFacebookShare = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      posthog?.capture("social_share_clicked", { platform: "facebook" });

      // On phones, prefer the native share sheet so an installed Facebook app
      // opens its composer instead of loading facebook.com in the browser.
      if (!pageUrl || !isMobile || !canWebShare) {
        return;
      }
      event.preventDefault();
      try {
        await navigator.share({ text: sharePlain || undefined, url: pageUrl });
      } catch (error) {
        // User dismissed the sheet → do nothing. Any other failure → fall back
        // to the web sharer so the click is never a dead end.
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        window.open(facebookHref, "_blank", "noopener,noreferrer");
      }
    },
    [posthog, pageUrl, isMobile, canWebShare, sharePlain, facebookHref],
  );

  const handleCopyLink = useCallback(async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [pageUrl]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    borderTop: `1px solid ${theme.colors.paperDim}`,
    borderBottom: `1px solid ${theme.colors.paperDim}`,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  };

  const innerFlexStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xl,
    alignItems: "flex-start",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.xs,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    fontSize: "11px",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: theme.colors.everglade,
    marginRight: theme.spacing.sm,
  };

  const iconButtonStyle: React.CSSProperties = {
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: theme.radius.pill,
    border: `1px solid ${theme.colors.paperDim}`,
    backgroundColor: theme.colors.white,
    color: theme.colors.everglade,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
    cursor: "pointer",
  };

  const copyButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    width: "auto",
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.sm,
  };

  const facebookAriaLabel = "Share this page on Facebook";
  const linkedInAriaLabel = "Share this page on LinkedIn";
  const twitterAriaLabel = "Share this page on X (Twitter)";
  const emailAriaLabel = "Share this page by email";
  const nextdoorAriaLabel = "Share this page on Nextdoor";
  const copyButtonLabel = copied ? "Copied" : "Copy link";

  return (
    <section style={sectionStyle} aria-label="Social sharing">
      <div className={`${layoutClass.containerWide} social-share-inner`} style={innerFlexStyle}>
        <style>{`
          @media (min-width: 640px) {
            .social-share-inner {
              flex-direction: row !important;
              flex-wrap: wrap !important;
              justify-content: space-between !important;
              align-items: center !important;
            }
          }
          .social-share-icon:hover {
            background-color: ${theme.colors.everglade} !important;
            color: ${theme.colors.white} !important;
            border-color: ${theme.colors.everglade} !important;
          }
          .social-share-icon:focus-visible {
            outline: 2px solid ${theme.colors.everglade} !important;
            outline-offset: 2px;
            border-color: ${theme.colors.everglade} !important;
          }
        `}</style>
        <p style={{ ...labelStyle, margin: 0 }}>{heading}</p>
        <div style={rowStyle}>
          <a
            href={pageUrl ? facebookHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label={facebookAriaLabel}
            title={facebookAriaLabel}
            onClick={(event) => void handleFacebookShare(event)}
          >
            <Facebook height={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? linkedInHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label={linkedInAriaLabel}
            title={linkedInAriaLabel}
            onClick={() => posthog?.capture("social_share_clicked", { platform: "linkedin" })}
          >
            <Linkedin height={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? twitterHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label={twitterAriaLabel}
            title={twitterAriaLabel}
            onClick={() => posthog?.capture("social_share_clicked", { platform: "twitter" })}
          >
            <Twitter height={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? mailHref : undefined}
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label={emailAriaLabel}
            title={emailAriaLabel}
            onClick={() => posthog?.capture("social_share_clicked", { platform: "email" })}
          >
            <Mail height={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? nextdoorHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label={nextdoorAriaLabel}
            title={nextdoorAriaLabel}
            onClick={() => posthog?.capture("social_share_clicked", { platform: "nextdoor" })}
          >
            <svg
              aria-hidden
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-2.25v-5.836l-4.5 5.836H7.5V7.5h2.25v5.836l4.5-5.836H16.5v9z"
                fill="currentColor"
              />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => {
              posthog?.capture("social_share_clicked", {
                platform: "copy_link",
              });
              handleCopyLink();
            }}
            style={copyButtonStyle}
            className="social-share-icon"
            disabled={!pageUrl}
            aria-live="polite"
          >
            <Link height={16} strokeWidth={1.75} aria-hidden />
            {copyButtonLabel}
          </button>
        </div>
      </div>
    </section>
  );
};
