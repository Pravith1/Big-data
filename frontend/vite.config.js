import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api requests are forwarded to the Express backend
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
