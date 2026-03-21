import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  /** Origin only (e.g. https://www.tandra.me). Strips `/api/contact` if pasted by mistake. */
  const contactProxyTarget = (() => {
    const raw = env.VITE_CONTACT_API_URL?.trim().replace(/\/$/, '') ?? '';
    if (!raw) return '';
    return raw.replace(/\/api\/contact$/i, '').replace(/\/api$/i, '');
  })();

  return {
    plugins: [react()],
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
