import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LOCAL_API_URL = 'http://127.0.0.1:5080'

export default defineConfig(() => {
  const apiUrl = (process.env.VITE_API_URL || LOCAL_API_URL).replace(/:(5060|5050)(?=\/|$)/g, ':5080')

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path,
        },
      },
    },
  }
})