import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 3000 matches the backend's CORS_ALLOWED_ORIGINS default
// (mathsmentor-backend/.env.example) — no backend config change needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})
