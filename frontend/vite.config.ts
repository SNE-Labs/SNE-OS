import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({ jsxRuntime: "automatic" }),
    tailwindcss(),
  ],
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://api.snelabs.space',
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: process.env.VITE_WS_URL || 'https://api.snelabs.space',
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'web3': ['wagmi', 'viem', '@wagmi/core'],
          'charts': ['lightweight-charts'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
})
