import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Dev and preview servers proxy /api to the Kavach API, so the dashboard works with no extra config.
// Point it elsewhere with KAVACH_API=http://host:8000, or build with VITE_API_BASE for a static deploy.
const proxy = { '/api': { target: process.env.KAVACH_API ?? 'http://localhost:8000', changeOrigin: true } }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: { chunkSizeWarningLimit: 900 },
})
