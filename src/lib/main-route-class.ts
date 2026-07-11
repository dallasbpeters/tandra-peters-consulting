import { layoutClass } from "../styles/layout-classes";
import { isBackendRoutePath, isWalkRoutePath } from "./backend-routes";

const LEGAL_PATHS = new Set(["/privacy", "/terms", "/cookies"]);
const AD_DASHBOARD_PATHS = new Set(["/ads", "/advertising"]);
const TOOL_PATHS = new Set(["/upscaler"]);

/** Shared <main> class in SiteShell — one persistent view-transition target per sub-page. */
export const getMainRouteClass = (pathname: string): string => {
  if (pathname === "/workflow") {
    return `workflow-page ${layoutClass.pageMain}`;
  }

  if (pathname.startsWith("/articles/") && pathname !== "/articles") {
    return layoutClass.pageMainArticle;
  }

  if (LEGAL_PATHS.has(pathname)) {
    return `${layoutClass.pageMain} ${layoutClass.pageMainLegal}`;
  }

  if (AD_DASHBOARD_PATHS.has(pathname)) {
    return `${layoutClass.pageMainAdDashboard} site-page-main--backend`;
  }

  if (TOOL_PATHS.has(pathname)) {
    return `${layoutClass.pageMainAdDashboard} site-page-main--backend`;
  }

  if (isWalkRoutePath(pathname)) {
    // No fixed nav on walk routes — drop the nav-clearing top offset so the
    // walk view fills the viewport with no blank gap above its sticky header.
    return `${layoutClass.pageMain} site-page-main--backend site-page-main--walk`;
  }

  if (isBackendRoutePath(pathname)) {
    return `${layoutClass.pageMain} site-page-main--backend`;
  }

  return layoutClass.pageMain;
};
