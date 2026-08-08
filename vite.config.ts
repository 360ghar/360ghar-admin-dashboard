import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Injects a Content-Security-Policy meta tag into the PRODUCTION build only.
 * Dev is left untouched (Vite HMR needs inline scripts/styles).
 *
 * The theme script lives in `public/theme.js` (external), so `script-src 'self'`
 * works without 'unsafe-inline'. `style-src 'unsafe-inline'` is required by
 * React inline styles / Radix; `connect-src https:` covers the API, Supabase,
 * SSE and map/geocoding hosts.
 */
function cspPlugin(): Plugin {
  const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Dev-only proxy target: where the dev server forwards API calls. Read via
  // loadEnv so it stays server-side only (never bundled into the client).
  // Point this at a local backend when developing against one.
  const proxyTarget = loadEnv(mode, process.cwd(), '')['DEV_API_PROXY_TARGET'] ?? 'https://api.360ghar.com'

  return {
    plugins: [react(), cspPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Dev-only: forward API traffic to the backend so the browser only
        // ever talks to the dev origin — no CORS, and immune to dev-port
        // drift (5173/5174/...). Production builds use the absolute
        // VITE_API_BASE_URL instead. `/health` and `/config` live at the API
        // root (coreApi strips `/api/v1` from the base URL).
        '^/(api|health|config)(/|$)': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy, independently-cacheable vendors out of the main bundle.
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
            'vendor-charts': ['recharts'],
            'vendor-maps': ['leaflet', 'react-leaflet'],
            'vendor-markdown': ['react-markdown', 'dompurify'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-motion': ['motion'],
            'vendor-table': ['@tanstack/react-table'],
          },
        },
      },
    },
  }
})

