/// <reference types="vite/client" />

declare module "*.woff2?url" {
  const src: string;
  export default src;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    accept: Record<string, string[]>;
    description?: string;
  }>;
}

interface ImportMetaEnv {
  /**
   * Production origin only (e.g. https://www.tandra.me), not `/api/contact`.
   * When set, `pnpm dev` proxies `/api/contact` to this host.
   */
  readonly VITE_CONTACT_API_URL?: string;
  /** Elfsight Google Reviews widget UUID (from Install embed code). */
  readonly VITE_ELFSIGHT_WIDGET_ID?: string;
  /** Opt into local PostHog capture/proxy traffic. Production capture is enabled when token is set. */
  readonly VITE_ENABLE_POSTHOG_DEV?: string;
  /** Optional Google Workspace domain allowlist (e.g. birdcreekroofing.com). */
  readonly VITE_GOOGLE_ALLOWED_DOMAIN?: string;
  /** Comma-separated emails allowed to sign in (site gate + dashboard routes). */
  readonly VITE_GOOGLE_ALLOWED_EMAILS?: string;
  /**
   * When `true`, home-page sections wrapped in `GoogleAuthGate` require Google sign-in.
   * When unset or `false`, gated sections render normally (no sign-in).
   */
  readonly VITE_GOOGLE_AUTH_GATE_ENABLED?: string;
  /** Google OAuth web client id used by the protected `/seo` dashboard sign-in flow. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /**
   * Ingestion / proxy origin (e.g. https://t.tandra.me or https://us.i.posthog.com).
   * In dev, a custom host is reached via Vite proxy only when `VITE_ENABLE_POSTHOG_DEV=true`.
   */
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
  /** PostHog project API key (public). */
  readonly VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?: string;
  /**
   * PostHog app origin for toolbar / session replay UI when `VITE_PUBLIC_POSTHOG_HOST`
   * is not `*.i.posthog.com`. Defaults to us or eu posthog.com from the host string.
   */
  readonly VITE_PUBLIC_POSTHOG_UI_HOST?: string;
  /**
   * Viewer (read-only) API token — required for draft content in Presentation / visual editing.
   * Create at sanity.io/manage → API → Tokens (Viewer). Bundled only for preview fetches in practice;
   * still treat as sensitive and rotate if leaked.
   */
  readonly VITE_SANITY_API_READ_TOKEN?: string;
  /** Force stega encoding on the published site (usually leave unset; iframe enables automatically). */
  readonly VITE_SANITY_STEGA?: string;
  /** Sanity Studio URL for stega “open in Studio” links (default http://localhost:3333). */
  readonly VITE_SANITY_STUDIO_URL?: string;
  /** Canonical site origin for structured data / SEO (no trailing slash). */
  readonly VITE_SITE_URL?: string;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonConfiguration {
  shape?: "pill" | "rectangular" | "circle" | "square";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  theme?: "outline" | "filled_blue" | "filled_black";
  width?: number | string;
}

interface Window {
  google?: {
    accounts?: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
        }): void;
        renderButton(
          parent: HTMLElement,
          options: GoogleButtonConfiguration
        ): void;
        disableAutoSelect(): void;
        prompt(): void;
      };
    };
  };
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions
  ) => Promise<FileSystemFileHandle>;
}
