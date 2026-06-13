import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: true,
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        secure: false,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        secure: false,
        changeOrigin: true,
      },
    },
  },
})
