import React, { useCallback, useState } from "react";
import { Facebook, Linkedin, Link2, Mail, Twitter } from "lucide-react";
import { theme } from "../theme";
import { SocialShareBarProps } from "../types";

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  heading = "Know someone who needs roofing help?",
  shareText = "Tandra Peters | BirdCreek Roofing consultant in Austin — assessments, insurance help, trusted installation",
}) => {
  const [copied, setCopied] = useState(false);

  const pageUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(shareText);

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${pageUrl}`)}`;

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
    backgroundColor: theme.colors.paperDim,
    borderTop: `1px solid ${theme.colors.paperDark}`,
    borderBottom: `1px solid ${theme.colors.paperDark}`,
    paddingTop: "2rem",
    paddingBottom: "2rem",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
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
    color: theme.colors.accent,
    marginRight: "0.5rem",
  };

  const iconButtonStyle: React.CSSProperties = {
    width: "2.75rem",
    height: "2.75rem",
    borderRadius: "9999px",
    border: `1px solid ${theme.colors.paperDark}`,
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

  return (
    <section
      style={sectionStyle}
      aria-label="Social sharing"
    >
      <div style={innerStyle} className="social-share-inner">
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
        `}</style>
        <p style={{ ...labelStyle, margin: 0 }}>{heading}</p>
        <div style={rowStyle}>
          <a
            href={pageUrl ? facebookHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label="Share on Facebook"
          >
            <Facebook size={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? linkedInHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label="Share on LinkedIn"
          >
            <Linkedin size={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? twitterHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label="Share on X (Twitter)"
          >
            <Twitter size={18} strokeWidth={1.75} aria-hidden />
          </a>
          <a
            href={pageUrl ? mailHref : undefined}
            style={iconButtonStyle}
            className="social-share-icon"
            aria-label="Share by email"
          >
            <Mail size={18} strokeWidth={1.75} aria-hidden />
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            style={copyButtonStyle}
            className="social-share-icon"
            aria-label={copied ? "Link copied" : "Copy page link"}
            disabled={!pageUrl}
          >
            <Link2 size={16} strokeWidth={1.75} aria-hidden />
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </section>
  );
};
