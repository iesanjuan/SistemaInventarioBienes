import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite abrir desde el móvil en la misma red (necesario para el escáner)
    port: 5173,
  },
})
