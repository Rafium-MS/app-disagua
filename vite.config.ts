import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/renderer', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 5173
  }
})
