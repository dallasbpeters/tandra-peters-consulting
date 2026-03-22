import { useEffect, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useSanitySite } from "../context/SanitySiteContext";
import { mapFooterProps, mapNavProps } from "../sanity/mapSanityHome";
import { TransitionLink } from "../components/TransitionLink";
import { theme } from "../theme";

type LegalLayoutProps = {
  title: string;
  children: ReactNode;
};

const articleStyle: CSSProperties = {
  maxWidth: "42rem",
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "1.5rem",
  paddingRight: "1.5rem",
  paddingTop: "6.5rem",
  paddingBottom: "5rem",
};

const backLinkStyle: CSSProperties = {
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
};

const h1Style: CSSProperties = {
  fontFamily: theme.fonts.headlineAlt,
  fontWeight: 600,
  fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
  lineHeight: 1.15,
  marginBottom: "2rem",
  color: theme.colors.everglade,
};

const bodyStyle: CSSProperties = {
  fontFamily: theme.fonts.body,
  fontSize: "1rem",
  lineHeight: 1.7,
  color: theme.colors.everglade,
};

const pStyle: CSSProperties = {
  marginBottom: "1rem",
};

const h2Style: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginTop: "2rem",
  marginBottom: "0.75rem",
  color: theme.colors.evergladeMuted,
};

const mutedStyle: CSSProperties = {
  fontSize: "0.875rem",
  color: `${theme.colors.everglade}99`,
  marginBottom: "2rem",
  lineHeight: 1.6,
};

export const LegalLayout = ({ title, children }: LegalLayoutProps) => {
  const { data } = useSanitySite();
  const site = data?.site as Record<string, unknown> | null | undefined;

  useEffect(() => {
    const homeTitle =
      "Tandra Peters | BirdCreek Roofing Consultant | Austin, TX";
    document.title = `${title} | Tandra Peters`;
    return () => {
      document.title = homeTitle;
    };
  }, [title]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.paper,
        color: theme.colors.everglade,
        fontFamily: theme.fonts.body,
      }}
    >
      <Nav {...mapNavProps(site)} />
      <main>
        <article style={articleStyle}>
          <style>{`
            .legal-back-link:hover,
            .legal-back-link:focus-visible {
              color: ${theme.colors.everglade} !important;
              opacity: 1 !important;
              outline: none;
            }
            .legal-back-link:focus-visible {
              box-shadow: 0 0 0 2px ${theme.colors.paper}, 0 0 0 4px ${theme.colors.everglade};
              border-radius: 4px;
            }
          `}</style>
          <TransitionLink
            to="/"
            className="legal-back-link"
            style={backLinkStyle}
            aria-label="Back to home page"
          >
            <ArrowLeft
              size={18}
              strokeWidth={2}
              aria-hidden
              style={{ flexShrink: 0, opacity: 0.85 }}
            />
            Back
          </TransitionLink>
          <h1 style={h1Style}>{title}</h1>
          <p style={mutedStyle}>
            This page is provided for transparency. It is not legal advice. For
            questions about your rights or obligations, consult a qualified
            attorney.
          </p>
          <div style={bodyStyle}>{children}</div>
        </article>
      </main>
      <Footer {...mapFooterProps(site)} />
    </div>
  );
};

export const legalSection = (key: string, heading: string, paragraphs: string[]) => (
  <section key={key} aria-labelledby={`legal-${key}`}>
    <h2 id={`legal-${key}`} style={h2Style}>
      {heading}
    </h2>
    {paragraphs.map((text, i) => (
      <p key={i} style={pStyle}>
        {text}
      </p>
    ))}
  </section>
);
