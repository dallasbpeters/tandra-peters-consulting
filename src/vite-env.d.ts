/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLY_WIDGET_ID?: string;
  /** Optional absolute URL for `/api/contact` when using `vite` without `vercel dev` */
  readonly VITE_CONTACT_API_URL?: string;
}
