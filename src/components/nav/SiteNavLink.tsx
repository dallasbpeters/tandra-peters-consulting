import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { useSiteNav } from "../../hooks/useSiteNav";
import { TransitionLink } from "../TransitionLink";

type SiteNavLinkProps = {
  href: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  viewTransition?: boolean;
  onClick?: () => void;
  onMouseEnter?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

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

  if (isHome) {
    return (
      <a
        href={href}
        style={style}
        className={className}
        onClick={handleSectionNavClick(href, onClick)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </a>
    );
  }

  if (href.startsWith("#") || href.startsWith("/")) {
    return (
      <TransitionLink
        to={resolveNavTo(href)}
        viewTransition={viewTransition}
        style={style}
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </TransitionLink>
    );
  }

  return (
    <a
      href={href}
      style={style}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </a>
  );
};
