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

// Routes that hide the persistent site chrome (fixed nav) and run full-bleed.
// The Desk Walk is a field tool whose slide-up drawer needs the full viewport —
// the fixed header would otherwise sit over the sheet. Each of these routes
// carries its own in-page "back" affordance.
const IMMERSIVE_ROUTE_PREFIXES = ["/desk/walk/"];

export const isImmersiveRoutePath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  return IMMERSIVE_ROUTE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix)
  );
};

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
