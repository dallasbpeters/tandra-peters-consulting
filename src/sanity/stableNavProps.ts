import type { NavProps } from "../types";

import { mapNavProps } from "./mapSanityHome";

const CACHE_KEY = "tandra:nav-props";

let memoryCache: Partial<NavProps> | null = null;

const isCompleteNavProps = (props: Partial<NavProps>): props is NavProps =>
  Boolean(props.ctaText && props.ctaHref && props.navItems && props.navItems.length > 0);

const readSessionCache = (): Partial<NavProps> | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<NavProps>;
    return isCompleteNavProps(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (props: NavProps) => {
  memoryCache = props;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(props));
  } catch {
    // sessionStorage unavailable
  }
};

/** Last known Sanity nav props — avoids default CTA / link flash while site settings load. */
export const resolveStableNavProps = (
  site: Record<string, unknown> | null | undefined,
): NavProps | null => {
  if (site) {
    const mapped = mapNavProps(site);
    if (isCompleteNavProps(mapped)) {
      writeCache(mapped);
      return mapped;
    }
  }

  if (memoryCache && isCompleteNavProps(memoryCache)) {
    return memoryCache;
  }

  const session = readSessionCache();
  if (session) {
    memoryCache = session;
    return session;
  }

  return null;
};
