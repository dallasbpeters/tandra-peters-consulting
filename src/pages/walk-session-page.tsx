import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { AuthPanel } from "../components/desk/auth-panel";
import { WalkSession } from "../components/desk/walk/walk-session";
import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { useCanvassTargets } from "../hooks/use-canvass-targets";
import { usePageMetadata } from "../hooks/use-page-metadata";
import type { AuthHeader } from "../lib/desk-types";
import { layoutClass } from "../styles/layout-classes";

import "../styles/desk.css";

export const WalkSessionPage = () => {
  const auth = useGoogleDashboardAuth();
  const { targetId = "" } = useParams();
  const authHeader = useMemo<AuthHeader>(
    () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : null),
    [auth.token]
  );
  const { saved, isLoadingSaved } = useCanvassTargets(authHeader);

  usePageMetadata({
    description:
      "Field walk view for a saved canvass target — track each home's status and notes.",
    robots: "noindex, nofollow",
    title: "The walk | Tandra Peters",
  });

  const target = useMemo(
    () => saved.find((item) => item.id === targetId) ?? null,
    [saved, targetId]
  );

  if (!auth.token) {
    return (
      <SitePageChrome>
        <div className={layoutClass.containerWide}>
          <AuthPanel auth={auth} />
        </div>
      </SitePageChrome>
    );
  }

  return (
    <SitePageChrome>
      <div className={layoutClass.containerNoContainer}>
        {(() => {
          if (target) {
            return <WalkSession auth={auth} target={target} />;
          }
          if (isLoadingSaved) {
            return (
              <p className="desk-empty desk-walk-standalone-message">
                Loading this walk…
              </p>
            );
          }
          return (
            <div className="desk-walk-standalone-message">
              <p className="desk-empty">
                This canvass target could not be found. It may have been
                deleted.
              </p>
              <TransitionLink className="desk-primary-link" to="/desk">
                Back to Desk
              </TransitionLink>
            </div>
          );
        })()}
      </div>
    </SitePageChrome>
  );
};
