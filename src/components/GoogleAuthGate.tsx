import { useEffect, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  GoogleAuthGateContext,
  useGoogleAuthGate,
  useGoogleAuthGateState,
  useOptionalGoogleAuthGate,
} from "../hooks/useGoogleAuthGate";
import { theme } from "../theme";

export const GoogleAuthGateProvider = ({ children }: { children: ReactNode }) => {
  const value = useGoogleAuthGateState();

  return (
    <GoogleAuthGateContext.Provider value={value}>
      {children}
      <GoogleAuthSignInModal />
    </GoogleAuthGateContext.Provider>
  );
};

type Props = {
  children?: ReactNode;
  fallback?: ReactNode;
};

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
      type="button"
      className="google-auth-gate__footer-trigger"
      aria-label="Sign in"
      onClick={auth.openSignInModal}
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
    !auth?.isGateActive ||
    !auth.isSignInModalOpen ||
    auth.isAuthenticated ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const handleBackdropClick = () => {
    auth.closeSignInModal();
  };

  const handleDialogClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div
      className="google-auth-gate__modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="google-auth-gate__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-auth-gate-modal-title"
        onClick={handleDialogClick}
      >
        <button
          type="button"
          className="google-auth-gate__modal-close"
          aria-label="Close sign-in"
          onClick={auth.closeSignInModal}
        >
          ×
        </button>
        <h2
          id="google-auth-gate-modal-title"
          style={{
            fontFamily: theme.fonts.headline,
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: theme.colors.black,
          }}
        >
          Sign in
        </h2>
        <p
          style={{
            marginBottom: "1.25rem",
            color: theme.colors.legalMuted,
            fontSize: "0.9375rem",
            lineHeight: 1.5,
          }}
        >
          Use an approved Google account to view the full site.
        </p>
        <div className="google-auth-gate__button">
          <div ref={auth.buttonRef} />
        </div>
        {!auth.ready ? (
          <p
            style={{
              marginTop: "0.75rem",
              color: theme.colors.legalMuted,
              fontSize: "0.875rem",
            }}
          >
            Loading Google sign-in…
          </p>
        ) : null}
        {auth.authError ? (
          <p
            role="alert"
            style={{
              marginTop: "0.75rem",
              color: theme.colors.danger,
              fontSize: "0.875rem",
            }}
          >
            {auth.authError}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
