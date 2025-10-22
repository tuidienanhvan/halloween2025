import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000, // Tăng limit lên 1000kB (1MB) để bớt warning tạm thời
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách three.js và deps nặng ra chunk riêng để load parallel
          three: ['three'],
          '@react-three/fiber': ['@react-three/fiber'],
          '@react-three/drei': ['@react-three/drei'],
        },
      },
    },
  },
})
