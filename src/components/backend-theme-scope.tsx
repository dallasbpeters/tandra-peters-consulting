import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { isBackendRoutePath } from "../lib/backend-routes";

const BACKEND_THEME_CLASS = "backend-theme";
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";
const DARK_THEME_CLASSES = ["dark", "wa-dark"] as const;

const setDarkModeClasses = (root: HTMLElement, enabled: boolean) => {
  for (const className of DARK_THEME_CLASSES) {
    root.classList.toggle(className, enabled);
  }
};

const applyBackendTheme = (
  root: HTMLElement,
  isBackendRoute: boolean,
  prefersDark: boolean
) => {
  root.classList.toggle(BACKEND_THEME_CLASS, isBackendRoute);
  setDarkModeClasses(root, isBackendRoute && prefersDark);
};

export const BackendThemeScope = () => {
  const { pathname } = useLocation();
  const isBackendRoute = isBackendRoutePath(pathname);

  useEffect(() => {
    const root = document.documentElement;
    const colorSchemeQuery = window.matchMedia(DARK_MODE_QUERY);
    const syncTheme = () => {
      applyBackendTheme(root, isBackendRoute, colorSchemeQuery.matches);
    };

    syncTheme();
    colorSchemeQuery.addEventListener("change", syncTheme);

    return () => {
      colorSchemeQuery.removeEventListener("change", syncTheme);
      root.classList.remove(BACKEND_THEME_CLASS);
      setDarkModeClasses(root, false);
    };
  }, [isBackendRoute]);

  return null;
};
