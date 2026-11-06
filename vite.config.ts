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
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        importScripts: ['push-sw.js']
      },
      manifest: {
        id: base,
        name: 'U.R. Charneca Atletismo',
        short_name: 'URC Atletismo',
        description: 'App Oficial da Equipa de Atletismo da União Recreativa da Charneca (Armada Azul) — Troféu de Cascais, Provas, Transporte, Dorsais e Treinos',
        theme_color: '#0a5fc0',
        background_color: '#f5f8ff',
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
