import { NavArrowLeft } from "iconoir-react";
import type { ReactNode } from "react";

import { TransitionLink } from "../components/transition-link";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { layoutClass } from "../styles/layout-classes";
import { typeStyles } from "../styles/site-typography";
import { theme } from "../theme";

interface LegalLayoutProps {
  children: ReactNode;
  title: string;
}

export const LegalLayout = ({ title, children }: LegalLayoutProps) => {
  usePageMetadata({
    description:
      "Policies and legal information for Tandra Peters and Birdcreek Roofing consultation services in Texas.",
    title: `${title} | Tandra Peters`,
  });

  return (
    <div
      style={{
        backgroundColor: theme.colors.paper,
        color: theme.colors.everglade,
        fontFamily: theme.fonts.body,
      }}
    >
      <article className={layoutClass.containerLegal}>
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
              border-radius: ${theme.radius.small};
            }
          `}</style>
        <TransitionLink
          aria-label="Back to home page"
          className="legal-back-link"
          style={typeStyles.backLink}
          to="/"
        >
          <NavArrowLeft
            aria-hidden
            height={18}
            strokeWidth={2}
            style={{ flexShrink: 0, opacity: 0.85 }}
            width={18}
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
    </div>
  );
};
