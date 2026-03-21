/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLY_WIDGET_ID?: string;
  /**
   * Production site origin (no trailing slash), e.g. https://tandra.me
   * When set, `pnpm dev` proxies `/api/*` there so the contact form works without `vercel dev`.
   */
  readonly VITE_CONTACT_API_URL?: string;
}
