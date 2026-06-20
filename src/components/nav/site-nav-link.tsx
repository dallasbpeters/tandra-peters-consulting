import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { isInPageHashHref, useSiteNav } from "../../hooks/use-site-nav";
import { TransitionLink } from "../transition-link";

interface SiteNavLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
  onClick?: () => void;
  onMouseEnter?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLAnchorElement>) => void;
  style?: CSSProperties;
  viewTransition?: boolean;
}

/** Resolves #section links to home + hash off-page; smooth-scrolls on the homepage. */
export const SiteNavLink = ({
  href,
  children,
  style,
  className,
  viewTransition = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SiteNavLinkProps) => {
  const { isHome, resolveNavTo, handleSectionNavClick } = useSiteNav();

  if (isHome && isInPageHashHref(href)) {
    return (
      <a
        className={className}
        href={href}
        onClick={handleSectionNavClick(href, onClick)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={style}
      >
        {children}
      </a>
    );
  }

  if (isInPageHashHref(href) || href.startsWith("/")) {
    return (
      <TransitionLink
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={style}
        to={resolveNavTo(href)}
        viewTransition={viewTransition}
      >
        {children}
      </TransitionLink>
    );
  }

  return (
    <a
      className={className}
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      {children}
    </a>
  );
};
