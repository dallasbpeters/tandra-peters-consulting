export interface GoogleAuthUser {
  email: string;
  hostedDomain?: string;
  name?: string;
  picture?: string;
}

/** Shared with dashboard routes — one sign-in covers both. */
export const GOOGLE_AUTH_STORAGE_KEY = "tandra:seo-dashboard:google-id-token";
const GOOGLE_SCRIPT_ID = "google-identity-services";
type GoogleCredentialHandler = (credential: string | null) => void;

const googleCredentialHandlers = new Set<GoogleCredentialHandler>();
let googleIdentityClientId: string | null = null;
let googleIdentityInitializePromise: Promise<void> | null = null;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const getGoogleAllowlistConfig = () => {
  const emails = new Set<string>();

  const envEmails = import.meta.env.VITE_GOOGLE_ALLOWED_EMAILS?.trim() ?? "";
  for (const email of envEmails.split(",")) {
    const normalized = normalizeEmail(email);
    if (normalized) {
      emails.add(normalized);
    }
  }

  const domain = normalizeEmail(
    import.meta.env.VITE_GOOGLE_ALLOWED_DOMAIN?.trim() ?? ""
  );

  return { domain, emails };
};

export const isAllowedGoogleUser = (user: GoogleAuthUser): boolean => {
  const { emails, domain } = getGoogleAllowlistConfig();

  if (emails.size === 0 && !domain) {
    return false;
  }

  const email = normalizeEmail(user.email);
  if (emails.size > 0 && emails.has(email)) {
    return true;
  }

  if (domain && normalizeEmail(user.hostedDomain ?? "") === domain) {
    return true;
  }

  return false;
};

export const parseGoogleJwtPayload = (token: string): GoogleAuthUser | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = JSON.parse(window.atob(padded)) as {
      email?: string;
      email_verified?: boolean;
      hd?: string;
      name?: string;
      picture?: string;
    };

    if (!json.email || json.email_verified !== true) {
      return null;
    }

    return {
      email: json.email,
      hostedDomain: json.hd,
      name: json.name,
      picture: json.picture,
    };
  } catch {
    return null;
  }
};

export const loadGoogleIdentityScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `#${GOOGLE_SCRIPT_ID}`
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google script")),
        {
          once: true,
        }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.append(script);
  });

export const subscribeGoogleCredential = (
  handler: GoogleCredentialHandler
): (() => void) => {
  googleCredentialHandlers.add(handler);
  return () => {
    googleCredentialHandlers.delete(handler);
  };
};

export const initializeGoogleIdentity = (clientId: string): Promise<void> => {
  if (googleIdentityClientId === clientId) {
    return Promise.resolve();
  }

  if (googleIdentityInitializePromise) {
    return googleIdentityInitializePromise;
  }

  googleIdentityInitializePromise = loadGoogleIdentityScript()
    .then(() => {
      if (!window.google?.accounts?.id) {
        throw new Error("Could not load Google sign-in.");
      }

      window.google.accounts.id.initialize({
        auto_select: false,
        callback: (response) => {
          for (const handler of googleCredentialHandlers) {
            handler(response.credential ?? null);
          }
        },
        client_id: clientId,
      });
      googleIdentityClientId = clientId;
    })
    .finally(() => {
      googleIdentityInitializePromise = null;
    });

  return googleIdentityInitializePromise;
};

export const getGoogleClientId = (): string =>
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";

/** Read-only Google Contacts (own + auto-saved) for the recipient picker. */
export const GOOGLE_CONTACTS_SCOPE =
  "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly";

/** Per-file Drive access — the app only sees files it creates. */
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

interface CachedAccessToken {
  expiresAt: number;
  token: string;
}

const accessTokenCache = new Map<string, CachedAccessToken>();

/**
 * Obtain an OAuth access token for the given space-separated `scope` via the
 * GIS token client. Tokens are cached per-scope for the session; the first
 * request for a scope shows a consent popup, later ones reuse the grant.
 *
 * Pass `{ silent: true }` to attempt a no-popup grant (`prompt: ""`): GIS
 * returns a token only if the user is signed in and has already consented,
 * otherwise it rejects via `error_callback` without any UI. Use this to
 * restore a previously granted scope on page load (no user gesture available).
 */
export const requestGoogleAccessToken = async (
  clientId: string,
  scope: string,
  options?: { silent?: boolean }
): Promise<string> => {
  const cached = accessTokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  await loadGoogleIdentityScript();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google authorization is unavailable.");
  }

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ??
                response.error ??
                "Google authorization was denied."
            )
          );
          return;
        }
        accessTokenCache.set(scope, {
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
          token: response.access_token,
        });
        resolve(response.access_token);
      },
      client_id: clientId,
      error_callback: (error) =>
        reject(new Error(error.type ?? "Google authorization failed.")),
      scope,
    });
    client.requestAccessToken(options?.silent ? { prompt: "" } : undefined);
  });
};

/** When false, gated sections render without sign-in. Set `VITE_GOOGLE_AUTH_GATE_ENABLED=true` to enable. */
export const isGoogleAuthGateEnabled = (): boolean =>
  import.meta.env.VITE_GOOGLE_AUTH_GATE_ENABLED?.trim().toLowerCase() ===
  "true";
