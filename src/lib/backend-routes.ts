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

export const isBackendRoutePath = (pathname: string): boolean =>
  BACKEND_ROUTE_PATHS.has(normalizePathname(pathname));
