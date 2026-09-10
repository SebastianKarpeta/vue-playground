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
    // Cargo writes/locks files under src-tauri/target constantly while
    // building — Vite's watcher racing against that causes EBUSY crashes
    // on Windows, so it must never watch anything under src-tauri.
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})