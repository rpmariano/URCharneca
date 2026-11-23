import { defineConfig } from 'vitest/config'

// Config própria (sem o plugin PWA do vite.config.ts): os testes são só lógica pura.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
