import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

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

  return {
    plugins: [
      react(),
      {
        name: 'html-site-url',
        transformIndexHtml(html) {
          return html.replaceAll('%SITE_URL%', siteUrl);
        },
      },
      ViteImageOptimizer({
        /** OG/Twitter card art must stay full resolution; sharp was shrinking this to ~12kB. */
        exclude: 'og-image.png',
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
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      ...(contactProxyTarget
        ? {
            proxy: {
              '/api': {
                target: contactProxyTarget,
                changeOrigin: true,
                secure: true,
              },
            },
          }
        : {}),
    },
  };
});
