import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: '${import.meta.env.VITE_API_URL}',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})