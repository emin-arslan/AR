import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true,
    cors: true
  },
  optimizeDeps: {
    include: ['three']
  }
})
