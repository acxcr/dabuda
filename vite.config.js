import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: 'util'
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    https: false
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@metamask/detect-provider']
  }
})
