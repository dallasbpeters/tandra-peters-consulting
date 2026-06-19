const TRAILING_SLASH_RE = /\/$/;

const trimHost = (value: string | undefined): string =>
  (value ?? "").trim().replace(TRAILING_SLASH_RE, "");

const CLOUD_INGESTION_RE = /^https:\/\/(us|eu)\.i\.posthog\.com$/i;
const TOOLBAR_PARAMS_KEY = "_postHogToolbarParams";
const US_CLOUD_INGEST = "https://us.i.posthog.com";
const US_CLOUD_UI = "https://us.posthog.com";

/** PostHog toolbar only appears after Launch toolbar — hash or persisted params. */
export const hasToolbarLaunchIntent = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const hash = window.location.hash;
  if (hash.includes("__posthog") || hash.includes("ph_authorize")) {
    return true;
  }

  const projectToken =
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!projectToken) {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(TOOLBAR_PARAMS_KEY);
    if (!stored) {
      return false;
    }
    const parsed = JSON.parse(stored) as { token?: string };
    return parsed.token === projectToken;
  } catch {
    return false;
  }
};

export const isPosthogEnabled = (): boolean => {
  const hasToken = Boolean(
    import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim()
  );

  return (
    hasToken &&
    (import.meta.env.PROD || import.meta.env.VITE_ENABLE_POSTHOG_DEV === "true")
  );
};

/**
 * When `VITE_PUBLIC_POSTHOG_HOST` is a first-party proxy (e.g. https://t.tandra.me),
 * the browser would normally call that origin from localhost and hit CORS unless the
 * proxy sends Access-Control-Allow-Origin. Dev analytics is opt-in; when enabled,
 * we use same-origin + Vite proxy instead.
 */
export const resolvePosthogClientOptions = (): {
  api_host: string;
  ui_host?: string;
  autocapture: boolean;
  capture_performance: boolean;
  disable_external_dependency_loading: boolean;
  disable_session_recording: boolean;
  disable_surveys: boolean;
} => {
  const devCaptureEnabled =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_POSTHOG_DEV === "true";
  const toolbarLaunch = hasToolbarLaunchIntent();

  const configuredHost =
    trimHost(import.meta.env.VITE_PUBLIC_POSTHOG_HOST) || US_CLOUD_INGEST;
  const isCloudIngestion = CLOUD_INGESTION_RE.test(configuredHost);

  // Dev + toolbar: talk to PostHog cloud directly so toolbar assets hit us-assets.posthog.com
  // instead of the first-party proxy (custom region breaks asset routing).
  const useDevCloudDirect =
    devCaptureEnabled || (import.meta.env.DEV && toolbarLaunch);
  const useDevSameOrigin =
    import.meta.env.DEV &&
    configuredHost &&
    !isCloudIngestion &&
    !useDevCloudDirect;

  const api_host_fallback = useDevSameOrigin
    ? window.location.origin
    : configuredHost;
  const api_host = useDevCloudDirect ? US_CLOUD_INGEST : api_host_fallback;

  const uiFromEnv = trimHost(import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST);
  const uiFallback =
    useDevCloudDirect || (!isCloudIngestion && configuredHost)
      ? US_CLOUD_UI
      : undefined;
  const ui_host = uiFromEnv || uiFallback;

  const allowToolbarAssets = devCaptureEnabled || toolbarLaunch;

  return {
    api_host,
    ...(ui_host ? { ui_host } : {}),
    autocapture: false,
    capture_performance: true,
    // Toolbar loads external scripts from ui_host — enable in dev or when launched from PostHog.
    disable_external_dependency_loading: !allowToolbarAssets,
    disable_session_recording: true,
    disable_surveys: true,
  };
};
