import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { GoogleAuthUser } from "../lib/google-auth-core";
import {
  GOOGLE_AUTH_STORAGE_KEY,
  getGoogleClientId,
  initializeGoogleIdentity,
  isAllowedGoogleUser,
  isGoogleTokenExpired,
  msUntilGoogleTokenExpires,
  parseGoogleJwtPayload,
  requestGoogleAccessToken,
  subscribeGoogleCredential,
} from "../lib/google-auth-core";

export type { GoogleAuthUser as DashboardUser } from "../lib/google-auth-core";

export interface DashboardAuthContextValue {
  authError: string | null;
  /** Attach to a <div> to render the Google sign-in button there. */
  buttonRef: React.RefCallback<HTMLDivElement>;
  clientId: string;
  ready: boolean;
  /** Request an OAuth access token for extra scopes (Contacts, Drive). */
  requestAccessToken: (
    scope: string,
    options?: { silent?: boolean }
  ) => Promise<string>;
  signOut: (message?: string) => void;
  token: string | null;
  user: GoogleAuthUser | null;
}

const DashboardAuthContext = createContext<DashboardAuthContextValue | null>(
  null
);

const useDashboardAuthState = (): DashboardAuthContextValue => {
  const clientId = getGoogleClientId();
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

  const requestAccessToken = useCallback(
    (scope: string, options?: { silent?: boolean }) => {
      if (!clientId) {
        return Promise.reject(new Error("Missing VITE_GOOGLE_CLIENT_ID."));
      }
      return requestGoogleAccessToken(clientId, scope, options);
    },
    [clientId]
  );

  // Holds the expiry-timer id so it can be cancelled on unmount / re-auth.
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleExpiryTimer = useCallback((credential: string) => {
    if (expiryTimerRef.current !== null) {
      clearTimeout(expiryTimerRef.current);
    }
    const ms = msUntilGoogleTokenExpires(credential);
    if (ms <= 0) {
      return;
    }
    // Clear the token 30 s before expiry so the next API call doesn't race.
    expiryTimerRef.current = setTimeout(
      () => {
        window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
        setToken(null);
        setUser(null);
        setAuthError("Google sign-in expired. Please sign in again.");
      },
      Math.max(0, ms - 30_000)
    );
  }, []);

  const setTokenFromCredential = useCallback(
    (credential: string) => {
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
      scheduleExpiryTimer(credential);
    },
    [scheduleExpiryTimer]
  );

  // Restore session from localStorage on mount (skip if token has expired).
  useEffect(() => {
    const stored = window.localStorage.getItem(GOOGLE_AUTH_STORAGE_KEY);
    if (!stored) {
      return;
    }
    if (isGoogleTokenExpired(stored)) {
      // Token is no longer valid — clear it so sign-in button is shown.
      window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
      return;
    }
    const parsed = parseGoogleJwtPayload(stored);
    if (!(parsed && isAllowedGoogleUser(parsed))) {
      window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
      return;
    }
    setToken(stored);
    setUser(parsed);
    scheduleExpiryTimer(stored);
  }, [scheduleExpiryTimer]);

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
      if (expiryTimerRef.current !== null) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, [clientId, setTokenFromCredential]);

  // readyRef lets the callback ref re-render the button without being stale.
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;

  // Callback ref: renders the Google sign-in button into whatever <div> is
  // currently mounted. When the user navigates between tool pages, the new
  // page's div calls this and gets the button immediately.
  const buttonRef = useCallback((node: HTMLDivElement | null) => {
    if (
      !(
        node &&
        readyRef.current &&
        clientIdRef.current &&
        window.google?.accounts?.id
      )
    ) {
      return;
    }
    node.innerHTML = "";
    window.google.accounts.id.renderButton(node, {
      shape: "pill",
      size: "large",
      text: "signin_with",
      theme: "outline",
      width: 280,
    });
  }, []);

  // Also re-render the button when `ready` flips to true (initial load).
  const buttonNodeRef = useRef<HTMLDivElement | null>(null);
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      buttonNodeRef.current = node;
      buttonRef(node);
    },
    [buttonRef]
  );

  useEffect(() => {
    if (ready && buttonNodeRef.current) {
      buttonRef(buttonNodeRef.current);
    }
  }, [ready, buttonRef]);

  return useMemo(
    () => ({
      authError,
      buttonRef: combinedRef,
      clientId,
      ready,
      requestAccessToken,
      signOut,
      token,
      user,
    }),
    [
      authError,
      combinedRef,
      clientId,
      ready,
      requestAccessToken,
      signOut,
      token,
      user,
    ]
  );
};

export const DashboardAuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useDashboardAuthState();
  return (
    <DashboardAuthContext.Provider value={value}>
      {children}
    </DashboardAuthContext.Provider>
  );
};

export const useDashboardAuth = (): DashboardAuthContextValue => {
  const context = useContext(DashboardAuthContext);
  if (!context) {
    throw new Error(
      "useDashboardAuth must be used within DashboardAuthProvider."
    );
  }
  return context;
};

export const useGoogleDashboardAuth = useDashboardAuth;
