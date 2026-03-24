import { useCallback, useEffect, useRef, useState } from "react";

type GoogleDashboardUser = {
  email: string;
  name?: string;
  picture?: string;
};

const STORAGE_KEY = "tandra:seo-dashboard:google-id-token";
const GOOGLE_SCRIPT_ID = "google-identity-services";

const parseJwtPayload = (token: string): GoogleDashboardUser | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = JSON.parse(window.atob(padded)) as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!json.email) {
      return null;
    }

    return {
      email: json.email,
      name: json.name,
      picture: json.picture,
    };
  } catch {
    return null;
  }
};

const loadGoogleScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

export const useGoogleDashboardAuth = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleDashboardUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const signOut = useCallback((message?: string) => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.google?.accounts?.id.disableAutoSelect();
    setToken(null);
    setUser(null);
    setAuthError(message ?? null);
  }, []);

  const setTokenFromCredential = useCallback((credential: string) => {
    const parsed = parseJwtPayload(credential);
    if (!parsed) {
      setAuthError("Google returned an unusable ID token.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, credential);
    setToken(credential);
    setUser(parsed);
    setAuthError(null);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseJwtPayload(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!clientId) {
      setAuthError("Missing VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              setTokenFromCredential(response.credential);
            } else {
              setAuthError("Google sign-in did not return a credential.");
            }
          },
          auto_select: false,
        });
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : "Could not load Google sign-in.");
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [clientId, setTokenFromCredential]);

  useEffect(() => {
    if (!ready || !buttonRef.current || !window.google?.accounts?.id || !clientId) {
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
