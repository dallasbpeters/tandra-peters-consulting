import { useCallback, useEffect, useRef, useState } from "react";

import {
  GOOGLE_AUTH_STORAGE_KEY,
  type GoogleAuthUser,
  getGoogleClientId,
  initializeGoogleIdentity,
  isAllowedGoogleUser,
  parseGoogleJwtPayload,
  subscribeGoogleCredential,
} from "../lib/googleAuthCore";

export type { GoogleAuthUser as GoogleDashboardUser } from "../lib/googleAuthCore";

export const useGoogleDashboardAuth = () => {
  const clientId = getGoogleClientId();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleAuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const signOut = useCallback((message?: string) => {
    window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
    window.google?.accounts?.id.disableAutoSelect();
    setToken(null);
    setUser(null);
    setAuthError(message ?? null);
  }, []);

  const setTokenFromCredential = useCallback((credential: string) => {
    const parsed = parseGoogleJwtPayload(credential);
    if (!parsed) {
      setAuthError("Google returned an unusable ID token.");
      return;
    }

    if (!isAllowedGoogleUser(parsed)) {
      window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setAuthError("This Google account is not allowed.");
      return;
    }

    window.localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, credential);
    setToken(credential);
    setUser(parsed);
    setAuthError(null);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(GOOGLE_AUTH_STORAGE_KEY);
    if (!stored) {
      return;
    }

    const parsed = parseGoogleJwtPayload(stored);
    if (!(parsed && isAllowedGoogleUser(parsed))) {
      window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
      if (parsed && !isAllowedGoogleUser(parsed)) {
        setAuthError("This Google account is not allowed.");
      }
      return;
    }

    setToken(stored);
    setUser(parsed);
  }, []);

  useEffect(() => {
    if (!clientId) {
      setAuthError("Missing VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    let cancelled = false;
    const unsubscribe = subscribeGoogleCredential((credential) => {
      if (cancelled) {
        return;
      }

      if (credential) {
        setTokenFromCredential(credential);
      } else {
        setAuthError("Google sign-in did not return a credential.");
      }
    });

    const setup = async () => {
      try {
        await initializeGoogleIdentity(clientId);
        if (cancelled || !window.google?.accounts?.id) {
          return;
        }
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Could not load Google sign-in."
          );
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [clientId, setTokenFromCredential]);

  useEffect(() => {
    if (
      !(ready && buttonRef.current && window.google?.accounts?.id && clientId)
    ) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 280,
      text: "signin_with",
      shape: "pill",
    });
  }, [clientId, ready]);

  return {
    authError,
    buttonRef,
    clientId,
    ready,
    signOut,
    token,
    user,
  };
};
