import { usePostHog } from "@posthog/react";
import { useEffect } from "react";

import { AuthPanel } from "../components/desk/auth-panel";
import { DeskDashboard } from "../components/desk/desk-dashboard";
import { SitePageChrome } from "../components/site-page-chrome";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { layoutClass } from "../styles/layout-classes";

import "../styles/desk.css";

export const DeskPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const requireAuth = !auth.token;

  usePageMetadata({
    description:
      "Internal Desk dashboard for proactive roofing outreach, campaign planning, and lead capture targets.",
    robots: "noindex, nofollow",
    title: "Desk | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("desk_viewed");
  }, [posthog]);

  return (
    <SitePageChrome>
      {requireAuth ? (
        <div className={layoutClass.containerWide}>
          <AuthPanel auth={auth} />
        </div>
      ) : (
        <DeskDashboard auth={auth} />
      )}
    </SitePageChrome>
  );
};
