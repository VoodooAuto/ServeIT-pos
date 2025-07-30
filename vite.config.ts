import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Force pre-bundling of types to avoid SES conflicts
    include: ['react', 'react-dom'],
    esbuildOptions: {
      // Ensure proper module format
      format: 'esm',
      target: 'esnext',
    },
  },
  build: {
    // Ensure consistent module format
    target: 'esnext',
    modulePreload: {
      polyfill: true,
    },
    // Optimize build for production
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled'],
        }
      }
    }
  },
  resolve: {
    // Explicit extensions for better module resolution
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
})
