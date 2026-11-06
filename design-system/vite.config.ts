import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Build da biblioteca de componentes (usado pela sincronização com o Claude Design)
export default defineConfig({
  root: resolve(import.meta.dirname, '..'),
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, '../src/design-system/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
})
