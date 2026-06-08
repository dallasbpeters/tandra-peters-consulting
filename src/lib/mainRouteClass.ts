import { layoutClass } from "../styles/layoutClasses";

const LEGAL_PATHS = new Set(["/privacy", "/terms", "/cookies"]);

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

  return layoutClass.pageMain;
};
