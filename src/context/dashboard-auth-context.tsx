import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { GoogleAuthUser } from "../lib/google-auth-core";
import {
  GOOGLE_AUTH_STORAGE_KEY,
  getGoogleClientId,
  initializeGoogleIdentity,
  isAllowedGoogleUser,
  parseGoogleJwtPayload,
  subscribeGoogleCredential,
} from "../lib/google-auth-core";

export type { GoogleAuthUser as DashboardUser } from "../lib/google-auth-core";

export interface DashboardAuthContextValue {
  authError: string | null;
  /** Attach to a <div> to render the Google sign-in button there. */
  buttonRef: React.RefCallback<HTMLDivElement>;
  clientId: string;
  ready: boolean;
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

  // Restore session from localStorage on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(GOOGLE_AUTH_STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = parseGoogleJwtPayload(stored);
    if (!(parsed && isAllowedGoogleUser(parsed))) {
      window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
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
      signOut,
      token,
      user,
    }),
    [authError, combinedRef, clientId, ready, signOut, token, user]
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
