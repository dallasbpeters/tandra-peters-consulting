import { type ReactNode } from "react";
import { NavArrowLeft } from "iconoir-react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useSanitySite } from "../context/SanitySiteContext";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { mapFooterProps, mapNavProps } from "../sanity/mapSanityHome";
import { TransitionLink } from "../components/TransitionLink";
import { layoutClass } from "../styles/layoutClasses";
import { typeStyles } from "../styles/siteTypography";
import { theme } from "../theme";

type LegalLayoutProps = {
  title: string;
  children: ReactNode;
};

export const LegalLayout = ({ title, children }: LegalLayoutProps) => {
  const { data } = useSanitySite();
  usePageMetadata({
    title: `${title} | Tandra Peters`,
    description:
      "Policies and legal information for Tandra Peters and BirdCreek Roofing consultation services in Texas.",
  });
  const site = data?.site as Record<string, unknown> | null | undefined;

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
        <article
          className={`${layoutClass.pageMain} ${layoutClass.pageMainLegal} ${layoutClass.containerLegal}`}
        >
          <style>{`
            .legal-back-link:hover,
            .legal-back-link:focus-visible {
              color: ${theme.colors.everglade} !important;
              opacity: 1 !important;
              outline: 2px solid ${theme.colors.accentLight};
            outline-offset: 2px;
            }
            .legal-back-link:focus-visible {
              box-shadow: 0 0 0 2px ${theme.colors.paper}, 0 0 0 4px ${theme.colors.everglade};
              border-radius: 4px;
            }
          `}</style>
          <TransitionLink
            to="/"
            className="legal-back-link"
            style={typeStyles.backLink}
            aria-label="Back to home page"
          >
            <NavArrowLeft
              width={18}
              height={18}
              strokeWidth={2}
              aria-hidden
              style={{ flexShrink: 0, opacity: 0.85 }}
            />
            Back
          </TransitionLink>
          <h1 style={typeStyles.legalPageTitle}>{title}</h1>
          <p style={typeStyles.legalMuted}>
            This page is provided for transparency. It is not legal advice. For
            questions about your rights or obligations, consult a qualified
            attorney.
          </p>
          <div style={typeStyles.legalBody}>{children}</div>
        </article>
      </main>
      <Footer {...mapFooterProps(site)} />
    </div>
  );
};
