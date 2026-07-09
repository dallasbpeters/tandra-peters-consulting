import { WarningTriangle } from "iconoir-react";

import { useGoogleDashboardAuth } from "../../context/dashboard-auth-context";

export const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="desk-auth">
    <WarningTriangle aria-hidden height={22} width={22} />
    <div>
      <h1>Sign in to Desk</h1>
      <p>Private acquisition planning for Tandra&apos;s outreach work.</p>
      {auth.clientId ? <div ref={auth.buttonRef} /> : null}
      {auth.clientId ? null : (
        <p>
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable dashboard sign-in.
        </p>
      )}
      {auth.authError ? <p>{auth.authError}</p> : null}
    </div>
  </section>
);
