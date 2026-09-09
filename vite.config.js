import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { defaultExclude } from 'vitest/config'

export default defineConfig({
  base: '/vue/',
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'jsdom',
    exclude: [...defaultExclude, 'src/tests/e2e/**'],
  },
  server: {
    proxy: {
      '/vue/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/vue\/api/, ''),
      },
    },
  },
})