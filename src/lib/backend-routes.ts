import type { NavItem } from "../types";

const BACKEND_ROUTE_PATHS = new Set([
  "/agent",
  "/ads",
  "/advertising",
  "/calendar",
  "/desk",
  "/email",
  "/email-composer",
  "/emails",
  "/marketing",
  "/response",
  "/seo",
  "/upscaler",
  "/videos",
]);

const normalizePathname = (pathname: string): string => {
  if (pathname === "/") {
    return pathname;
  }
  return pathname.replace(/\/+$/u, "");
};

export const backendNavItems: NavItem[] = [
  { href: "/desk", name: "Desk" },
  { href: "/calendar", name: "Calendar" },
  { href: "/seo", name: "SEO" },
  { href: "/videos", name: "Videos" },
  { href: "/marketing", name: "Marketing Agent" },
  { href: "/response", name: "Response Agent" },
  { href: "/ads", name: "Ad Builder" },
  { href: "/emails", name: "Email Builder" },
  { href: "/upscaler", name: "Image Upscaler" },
];

export const isBackendRoutePath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  if (BACKEND_ROUTE_PATHS.has(normalized)) {
    return true;
  }
  for (const base of BACKEND_ROUTE_PATHS) {
    if (normalized.startsWith(`${base}/`)) {
      return true;
    }
  }
  return false;
};

const WALK_ROUTE_BASE = "/desk/walk";

/**
 * Full-screen field walk routes (`/desk/walk/:targetId`). The site nav is
 * hidden entirely on these so the pull-up home-detail sheet and map controls
 * are never obstructed.
 */
export const isWalkRoutePath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  return (
    normalized === WALK_ROUTE_BASE ||
    normalized.startsWith(`${WALK_ROUTE_BASE}/`)
  );
};
