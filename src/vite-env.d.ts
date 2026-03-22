/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Elfsight Google Reviews widget UUID (from Install embed code). */
  readonly VITE_ELFSIGHT_WIDGET_ID?: string;
  /**
   * Production origin only (e.g. https://www.tandra.me), not `/api/contact`.
   * When set, `pnpm dev` proxies `/api/*` to this host.
   */
  readonly VITE_CONTACT_API_URL?: string;
}
