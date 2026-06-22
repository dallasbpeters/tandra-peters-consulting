import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  GoogleAuthGateContext,
  useGoogleAuthGate,
  useGoogleAuthGateState,
  useOptionalGoogleAuthGate,
} from "../hooks/use-google-auth-gate";
import { theme } from "../theme";

export const GoogleAuthGateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useGoogleAuthGateState();

  return (
    <GoogleAuthGateContext.Provider value={value}>
      {children}
      <GoogleAuthSignInModal />
    </GoogleAuthGateContext.Provider>
  );
};

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only when the auth gate is off or the user is signed in. */
export const GoogleAuthGate = ({ children, fallback = null }: Props) => {
  const { isUnlocked } = useGoogleAuthGate();
  return isUnlocked ? children : fallback;
};

/** Invisible hit target in the footer — opens the sign-in modal when the gate is locked. */
export const GoogleAuthFooterTrigger = () => {
  const auth = useOptionalGoogleAuthGate();

  if (!auth?.isGateActive || auth.isAuthenticated) {
    return null;
  }

  return (
    <button
      aria-label="Sign in"
      className="google-auth-gate__footer-trigger"
      onClick={auth.openSignInModal}
      tabIndex={0}
      type="button"
    />
  );
};

/** Modal with the Google sign-in button. Mount once inside `GoogleAuthGateProvider`. */
export const GoogleAuthSignInModal = () => {
  const auth = useOptionalGoogleAuthGate();

  useEffect(() => {
    if (!auth?.isSignInModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        auth.closeSignInModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [auth]);

  if (
    !(auth?.isGateActive && auth.isSignInModalOpen) ||
    auth.isAuthenticated ||
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click/Escape outside to dismiss
    <div
      className="google-auth-gate__modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          auth.closeSignInModal();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          auth.closeSignInModal();
        }
      }}
      role="presentation"
    >
      <dialog
        aria-labelledby="google-auth-gate-modal-title"
        aria-modal="true"
        className="google-auth-gate__modal"
        open
      >
        <button
          aria-label="Close sign-in"
          className="google-auth-gate__modal-close"
          onClick={auth.closeSignInModal}
          type="button"
        >
          ×
        </button>
        <h2
          id="google-auth-gate-modal-title"
          style={{
            color: theme.colors.black,
            fontFamily: theme.fonts.headline,
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: theme.spacing.sm,
          }}
        >
          Sign in
        </h2>
        <p
          style={{
            color: theme.colors.legalMuted,
            fontSize: "0.9375rem",
            lineHeight: 1.5,
            marginBottom: theme.spacing.xl,
          }}
        >
          Use an approved Google account to view the full site.
        </p>
        <div className="google-auth-gate__button">
          <div ref={auth.buttonRef} />
        </div>
        {auth.ready ? null : (
          <p
            style={{
              color: theme.colors.legalMuted,
              fontSize: "0.875rem",
              marginTop: theme.spacing.md,
            }}
          >
            Loading Google sign-in…
          </p>
        )}
        {auth.authError ? (
          <p
            role="alert"
            style={{
              color: theme.colors.danger,
              fontSize: "0.875rem",
              marginTop: theme.spacing.md,
            }}
          >
            {auth.authError}
          </p>
        ) : null}
      </dialog>
    </div>,
    document.body
  );
};
