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
    const base64 = payload.replaceAll(/-/g, "+").replaceAll(/_/g, "/");
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

/** When false, gated sections render without sign-in. Set `VITE_GOOGLE_AUTH_GATE_ENABLED=true` to enable. */
export const isGoogleAuthGateEnabled = (): boolean =>
  import.meta.env.VITE_GOOGLE_AUTH_GATE_ENABLED?.trim().toLowerCase() ===
  "true";
