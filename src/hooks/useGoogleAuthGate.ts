import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  GOOGLE_AUTH_STORAGE_KEY,
  type GoogleAuthUser,
  getGoogleClientId,
  initializeGoogleIdentity,
  isAllowedGoogleUser,
  isGoogleAuthGateEnabled,
  parseGoogleJwtPayload,
  subscribeGoogleCredential,
} from "../lib/googleAuthCore";

export interface GoogleAuthGateContextValue {
  authError: string | null;
  buttonRef: RefObject<HTMLDivElement | null>;
  closeSignInModal: () => void;
  isAuthenticated: boolean;
  isGateActive: boolean;
  isSignInModalOpen: boolean;
  isUnlocked: boolean;
  openSignInModal: () => void;
  promptSignIn: () => void;
  ready: boolean;
  signOut: () => void;
  token: string | null;
  user: GoogleAuthUser | null;
}

export const GoogleAuthGateContext =
  createContext<GoogleAuthGateContextValue | null>(null);

export const useGoogleAuthGateState = (): GoogleAuthGateContextValue => {
  const isGateActive = isGoogleAuthGateEnabled();
  const clientId = getGoogleClientId();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleAuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const closeSignInModal = useCallback(() => {
    setIsSignInModalOpen(false);
    setAuthError(null);
  }, []);

  const openSignInModal = useCallback(() => {
    if (!isGateActive || token) {
      return;
    }
    setIsSignInModalOpen(true);
  }, [isGateActive, token]);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
    window.google?.accounts?.id.disableAutoSelect();
    setToken(null);
    setUser(null);
    setAuthError(null);
    setIsSignInModalOpen(false);
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
    setIsSignInModalOpen(false);
  }, []);

  useEffect(() => {
    if (!isGateActive) {
      return;
    }

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
  }, [isGateActive]);

  useEffect(() => {
    if (!isGateActive) {
      return;
    }

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
  }, [clientId, isGateActive, setTokenFromCredential]);

  useEffect(() => {
    if (
      !(
        isGateActive &&
        ready &&
        isSignInModalOpen &&
        buttonRef.current &&
        window.google?.accounts?.id &&
        clientId
      )
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
  }, [clientId, isGateActive, isSignInModalOpen, ready]);

  const promptSignIn = useCallback(() => {
    if (!(isGateActive && ready && window.google?.accounts?.id)) {
      return;
    }

    window.google.accounts.id.prompt();

    window.requestAnimationFrame(() => {
      const googleButton = buttonRef.current?.querySelector<HTMLElement>(
        'div[role="button"], iframe'
      );
      googleButton?.click();
    });
  }, [isGateActive, ready]);

  const isAuthenticated = Boolean(token && user);
  const isUnlocked = !isGateActive || isAuthenticated;

  return useMemo(
    () => ({
      isGateActive,
      isUnlocked,
      isAuthenticated,
      isSignInModalOpen,
      ready,
      authError,
      user,
      token,
      buttonRef,
      openSignInModal,
      closeSignInModal,
      signOut,
      promptSignIn,
    }),
    [
      authError,
      closeSignInModal,
      isAuthenticated,
      isGateActive,
      isSignInModalOpen,
      isUnlocked,
      openSignInModal,
      promptSignIn,
      ready,
      signOut,
      token,
      user,
    ]
  );
};

export const useGoogleAuthGate = (): GoogleAuthGateContextValue => {
  const context = useContext(GoogleAuthGateContext);
  if (!context) {
    throw new Error(
      "useGoogleAuthGate must be used within GoogleAuthGateProvider."
    );
  }
  return context;
};

/** Safe for components that may render outside the provider (gate reads as inactive). */
export const useOptionalGoogleAuthGate =
  (): GoogleAuthGateContextValue | null => useContext(GoogleAuthGateContext);
