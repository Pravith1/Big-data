import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api requests are forwarded to the FastAPI backend
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
