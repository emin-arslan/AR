import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: {
      key: null,
      cert: null,
    },
    cors: true,
    hmr: {
      host: 'localhost',
      port: 3000
    }
  },
  preview: {
    port: 3000,
    host: true
  },
  optimizeDeps: {
    include: ['three']
  }
})
