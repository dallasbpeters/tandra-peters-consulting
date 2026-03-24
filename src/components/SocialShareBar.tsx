import React, { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Facebook, Linkedin, Twitter, Mail, Link} from 'iconoir-react'
import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import { SocialShareBarProps } from "../types";
import { usePostHog } from "@posthog/react";
import { plainTextFromRich } from "../portableText/plainText";
import { buildSharePageUrl } from "../utils/siteUrl";

const copyTextFallback = (text: string) => {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
};

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  heading = "Know someone who needs roofing help?",
  shareText = "Tandra Peters | Birdcreek Roofing consultant in Austin — assessments, insurance help, trusted installation",
}) => {
  const [copied, setCopied] = useState(false);
  const posthog = usePostHog();
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

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterHref = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(sharePlain)}&body=${encodeURIComponent(`${sharePlain}\n\n${pageUrl}`)}`;

  const handleCopyLink = useCallback(async () => {
    if (!pageUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pageUrl);
      } else {
        copyTextFallback(pageUrl);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        copyTextFallback(pageUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    }
  }, [pageUrl]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    borderTop: `1px solid ${theme.colors.paperDim}`,
    borderBottom: `1px solid ${theme.colors.paperDim}`,
    paddingTop: "1rem",
    paddingBottom: "1rem",
  };

  const innerFlexStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    alignItems: "flex-start",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    fontSize: "10px",
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: theme.colors.everglade,
    marginRight: "0.5rem",
  };

  const iconButtonStyle: React.CSSProperties = {
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "9999px",
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
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    width: "auto",
    paddingLeft: "1rem",
    paddingRight: "1rem",
    gap: "0.35rem",
  };

  const facebookAriaLabel = "Share this page on Facebook";
  const linkedInAriaLabel = "Share this page on LinkedIn";
  const twitterAriaLabel = "Share this page on X (Twitter)";
  const emailAriaLabel = "Share this page by email";
  const copyAriaLabel = copied ? "Page link copied" : "Copy page link to clipboard";

  return (
    <section
      style={sectionStyle}
      aria-label="Social sharing"
    >
      <div
        className={`${layoutClass.containerWide} social-share-inner`}
        style={innerFlexStyle}
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
        <div style={rowStyle}>
          <a
            href={pageUrl ? facebookHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label={facebookAriaLabel}
            title={facebookAriaLabel}
            onClick={() => posthog?.capture("social_share_clicked", { platform: "facebook" })}
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
          <button
            type="button"
            onClick={() => {
              posthog?.capture("social_share_clicked", { platform: "copy_link" });
              handleCopyLink();
            }}
            style={copyButtonStyle}
            className="social-share-icon"
            aria-label={copyAriaLabel}
            title={copyAriaLabel}
            disabled={!pageUrl}
          >
            <Link height={16} strokeWidth={1.75} aria-hidden />
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </section>
  );
};
