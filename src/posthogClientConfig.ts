const trimHost = (value: string | undefined): string =>
  (value ?? "").trim().replace(/\/$/, "");

const CLOUD_INGESTION_RE = /^https:\/\/(us|eu)\.i\.posthog\.com$/i;

/**
 * When `VITE_PUBLIC_POSTHOG_HOST` is a first-party proxy (e.g. https://t.tandra.me),
 * the browser would normally call that origin from localhost and hit CORS unless the
 * proxy sends Access-Control-Allow-Origin. In dev we use same-origin + Vite proxy instead.
 */
export const resolvePosthogClientOptions = (): {
  api_host: string;
  ui_host?: string;
} => {
  const configuredHost =
    trimHost(import.meta.env.VITE_PUBLIC_POSTHOG_HOST) ||
    "https://us.i.posthog.com";
  const isCloudIngestion = CLOUD_INGESTION_RE.test(configuredHost);

  const useDevSameOrigin =
    import.meta.env.DEV && configuredHost && !isCloudIngestion;

  const api_host = useDevSameOrigin
    ? window.location.origin
    : configuredHost;

  const uiFromEnv = trimHost(import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST);
  const ui_host =
    uiFromEnv ||
    (!isCloudIngestion && configuredHost ? "https://us.posthog.com" : undefined);

  return {
    api_host,
    ...(ui_host ? { ui_host } : {}),
  };
};
