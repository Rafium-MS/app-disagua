import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/components': resolve(__dirname, 'src/renderer/components'),
      '@/lib': resolve(__dirname, 'src/renderer/lib'),
      '@/hooks': resolve(__dirname, 'src/renderer/hooks')
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
})
