import { usePostHog } from "@posthog/react";
import { Facebook, Link, Linkedin, Mail, Twitter } from "iconoir-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { plainTextFromRich } from "../portableText/plain-text";
import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { SocialShareBarProps } from "../types";
import { buildNextdoorShareUrl } from "../utils/nextdoor-share";
import { buildSharePageUrl } from "../utils/site-url";

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  heading = "Know someone who needs roofing help?",
  shareText = "Tandra Peters | Birdcreek Roofing consultant in Austin — assessments, insurance help, trusted installation",
}) => {
  const [copied, setCopied] = useState(false);
  const posthog = usePostHog();
  const { pathname, search, hash } = useLocation();

  const pageUrl = useMemo(
    () => buildSharePageUrl(pathname, search, hash),
    [pathname, search, hash]
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

  // Open Facebook's share dialog directly on every platform. We deliberately do
  // NOT route this through the Web Share API on mobile — that pops the iOS share
  // sheet instead of taking the user straight to Facebook.
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterHref = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(sharePlain)}&body=${encodeURIComponent(`${sharePlain}\n\n${pageUrl}`)}`;
  const nextdoorHref = buildNextdoorShareUrl(
    `Check out ${sharePlain} ${pageUrl}`
  );

  const handleCopyLink = useCallback(async () => {
    if (!pageUrl) {
      return;
    }
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
    borderBottom: `1px solid ${theme.colors.paperDim}`,
    borderTop: `1px solid ${theme.colors.paperDim}`,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  };

  const labelStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headline,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.25em",
    marginRight: theme.spacing.sm,
    textTransform: "uppercase",
  };

  const iconButtonStyle: React.CSSProperties = {
    alignItems: "center",
    backgroundColor: theme.colors.white,
    border: `1px solid ${theme.colors.paperDim}`,
    borderRadius: theme.radius.pill,
    color: theme.colors.everglade,
    cursor: "pointer",
    display: "inline-flex",
    height: "2.75rem",
    justifyContent: "center",
    textDecoration: "none",
    transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
    width: "2.75rem",
  };

  const copyButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    fontFamily: theme.fonts.headline,
    fontSize: "11px",
    fontWeight: 700,
    gap: theme.spacing.sm,
    letterSpacing: "0.08em",
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    textTransform: "uppercase",
    width: "auto",
  };

  const facebookAriaLabel = "Share this page on Facebook";
  const linkedInAriaLabel = "Share this page on LinkedIn";
  const twitterAriaLabel = "Share this page on X (Twitter)";
  const emailAriaLabel = "Share this page by email";
  const nextdoorAriaLabel = "Share this page on Nextdoor";
  const copyButtonLabel = copied ? "Copied" : "Copy link";

  return (
    <section aria-label="Social sharing" style={sectionStyle}>
      <div
        className={`${layoutClass.containerWide} social-share-inner wa-stack wa-gap-m wa-align-items-start`}
      >
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
        <div className="wa-cluster wa-gap-3xs">
          <a
            aria-label={facebookAriaLabel}
            className="social-share-icon"
            href={pageUrl ? facebookHref : undefined}
            onClick={() =>
              posthog?.capture("social_share_clicked", { platform: "facebook" })
            }
            rel="noopener noreferrer"
            style={iconButtonStyle}
            target="_blank"
            title={facebookAriaLabel}
          >
            <Facebook aria-hidden height={18} strokeWidth={1.75} />
          </a>
          <a
            aria-label={linkedInAriaLabel}
            className="social-share-icon"
            href={pageUrl ? linkedInHref : undefined}
            onClick={() =>
              posthog?.capture("social_share_clicked", { platform: "linkedin" })
            }
            rel="noopener noreferrer"
            style={iconButtonStyle}
            target="_blank"
            title={linkedInAriaLabel}
          >
            <Linkedin aria-hidden height={18} strokeWidth={1.75} />
          </a>
          <a
            aria-label={twitterAriaLabel}
            className="social-share-icon"
            href={pageUrl ? twitterHref : undefined}
            onClick={() =>
              posthog?.capture("social_share_clicked", { platform: "twitter" })
            }
            rel="noopener noreferrer"
            style={iconButtonStyle}
            target="_blank"
            title={twitterAriaLabel}
          >
            <Twitter aria-hidden height={18} strokeWidth={1.75} />
          </a>
          <a
            aria-label={emailAriaLabel}
            className="social-share-icon"
            href={pageUrl ? mailHref : undefined}
            onClick={() =>
              posthog?.capture("social_share_clicked", { platform: "email" })
            }
            style={iconButtonStyle}
            title={emailAriaLabel}
          >
            <Mail aria-hidden height={18} strokeWidth={1.75} />
          </a>
          <a
            aria-label={nextdoorAriaLabel}
            className="social-share-icon"
            href={pageUrl ? nextdoorHref : undefined}
            onClick={() =>
              posthog?.capture("social_share_clicked", { platform: "nextdoor" })
            }
            rel="noopener noreferrer"
            style={iconButtonStyle}
            target="_blank"
            title={nextdoorAriaLabel}
          >
            <span className="sr-only">{nextdoorAriaLabel}</span>
            <svg
              aria-hidden="true"
              fill="none"
              height="18"
              viewBox="0 0 24 24"
              width="18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-2.25v-5.836l-4.5 5.836H7.5V7.5h2.25v5.836l4.5-5.836H16.5v9z"
                fill="currentColor"
              />
            </svg>
          </a>
          <button
            aria-live="polite"
            className="social-share-icon"
            disabled={!pageUrl}
            onClick={() => {
              posthog?.capture("social_share_clicked", {
                platform: "copy_link",
              });
              handleCopyLink();
            }}
            style={copyButtonStyle}
            type="button"
          >
            <Link aria-hidden height={16} strokeWidth={1.75} />
            {copyButtonLabel}
          </button>
        </div>
      </div>
    </section>
  );
};
