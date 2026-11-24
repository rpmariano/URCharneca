import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// No GitHub Pages a app vive em /URCharneca/ (definido no workflow de deploy).
const base = process.env.PAGES_BASE || '/'

export default defineConfig({
  base,
  build: {
    // Nomes de ficheiros só com letras e números: os hashes em base64 podem gerar nomes como
    // `Sheet--abc.js`, e o deploy do GitHub Pages falhou com eles.
    rollupOptions: { output: { hashCharacters: 'hex' } },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        importScripts: ['push-sw.js'],
        // Tipos de letra (Google Fonts): guardados na primeira visita para a app manter o aspeto sem rede.
        // Sem eles, o CSS usa as alternativas de sistema (ver --font-sans / --font-display em src/index.css).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        id: base,
        name: 'U.R. Charneca Atletismo',
        short_name: 'URC Atletismo',
        description: 'App Oficial da Equipa de Atletismo da União Recreativa da Charneca (Armada Azul): Troféu de Cascais, provas, transporte, dorsais e treinos',
        theme_color: '#004c94',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
