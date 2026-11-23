import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// port 3040: it's in the AuthApi CORS allowlist (cookies need an allowed origin; file:// can't work anymore)
export default defineConfig({ plugins: [react()], server: { port: 3040, strictPort: true } })
