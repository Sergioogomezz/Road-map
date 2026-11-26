import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Claves de Supabase (opcionales). Se aceptan los nombres que crea la
 * integración de Supabase en Vercel además de los propios de Vite, para que
 * baste con pulsar «Add» en Vercel. Solo se usa la clave PÚBLICA (anon o
 * publishable); una clave secreta nunca se mete en la app.
 */
function supabaseEnv(mode: string) {
  const env = loadEnv(mode, '.', '')
  const pick = (...names: string[]) => names.map((n) => env[n]?.trim()).find(Boolean) ?? ''
  // Si la integración añade un prefijo (p. ej. STORAGE_SUPABASE_URL), lo buscamos por el final del nombre.
  const bySuffix = (pattern: RegExp) => Object.keys(env).sort().filter((k) => pattern.test(k)).map((k) => env[k]?.trim()).find(Boolean) ?? ''
  const url =
    pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL') || bySuffix(/(^|_)SUPABASE_URL$/)
  const key =
    pick(
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ) || bySuffix(/(^|_)SUPABASE_(ANON|PUBLISHABLE)_KEY$/)
  if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    throw new Error('La clave de Supabase configurada es secreta (service_role). Usa la clave pública: anon o publishable.')
  }
  return { url, key }
}

function jwtRole(token: string): string | undefined {
  const part = token.split('.')[1]
  if (!part) return undefined
  try {
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))).role
  } catch {
    return undefined
  }
}

// `base: './'` permite publicar la carpeta dist/ en cualquier ruta
// (Vercel, Netlify, GitHub Pages en /road-map/pandilla/…).
export default defineConfig(({ mode }) => {
  const supabase = supabaseEnv(mode)
  return {
    base: './',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabase.url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabase.key),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: './',
          name: 'Pandilla · Viajes en grupo',
          short_name: 'Pandilla',
          description: 'Organiza el viaje con tus amigos: itinerario, votaciones, gastos, documentos offline y recuerdos.',
          lang: 'es',
          dir: 'ltr',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#F5F4F0',
          theme_color: '#F5F4F0',
          categories: ['travel', 'finance', 'productivity'],
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: { host: true },
  }
})
