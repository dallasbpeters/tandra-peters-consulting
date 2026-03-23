import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { ogImageComposite } from './plugins/ogImageComposite';
import { viteGeminiDevApi } from './plugins/viteGeminiDevApi';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  /** Canonical site origin for OG/Twitter meta in `index.html` (`%SITE_URL%`). */
  const siteUrl = (env.VITE_SITE_URL || 'https://www.tandra.me')
    .trim()
    .replace(/\/$/, '');

  /** Origin only (e.g. https://www.tandra.me). Strips `/api/contact` if pasted by mistake. */
  const contactProxyTarget = (() => {
    const raw = env.VITE_CONTACT_API_URL?.trim().replace(/\/$/, '') ?? '';
    if (!raw) return '';
    return raw.replace(/\/api\/contact$/i, '').replace(/\/api$/i, '');
  })();

  const posthogProxyTarget = env.VITE_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, '') ?? '';
  const posthogCloudIngestion = /^https:\/\/(us|eu)\.i\.posthog\.com$/i.test(
    posthogProxyTarget,
  );
  const usePosthogDevProxy =
    mode === 'development' && posthogProxyTarget && !posthogCloudIngestion;

  const posthogProxyBase = {
    target: posthogProxyTarget,
    changeOrigin: true,
    secure: true,
  };

  const devProxy: Record<string, typeof posthogProxyBase> = {};
  if (contactProxyTarget) {
    devProxy['/api/contact'] = {
      target: contactProxyTarget,
      changeOrigin: true,
      secure: true,
    };
  }
  if (usePosthogDevProxy) {
    // Path prefixes must not match app routes. Broad patterns like `^/s` proxy
    // `/src/*` (Vite modules) to PostHog and break Presentation preview + dev.
    for (const key of [
      '^/e/',
      '^/batch',
      '^/decide',
      '^/flags',
      '^/s/',
      '^/i/',
      '^/static/',
      '^/array/',
      '^/api/(?!contact(?:$|/))',
    ]) {
      devProxy[key] = {...posthogProxyBase};
    }
  }

  return {
    plugins: [
      viteGeminiDevApi(env),
      react(),
      {
        name: 'html-site-url',
        transformIndexHtml(html) {
          return html.replaceAll('%SITE_URL%', siteUrl);
        },
      },
      ViteImageOptimizer({
        /** Base OG PNG + roofline SVG are composited later; do not recompress the base PNG here. */
        exclude: ['roofline.svg'],
        png: { quality: 80 },
        jpeg: { quality: 75 },
        webp: { quality: 80 },
        avif: { quality: 70 },
        svg: {
          plugins: [
            { name: 'removeViewBox' },
            { name: 'sortAttrs' },
          ],
        },
      }),
      ogImageComposite(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      ...(Object.keys(devProxy).length > 0 ? {proxy: devProxy} : {}),
    },
  };
});
