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
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  server: {
    port: 5173,
    // Proxy removido - não funciona em produção Vercel
    // Usar apenas baseURL direto na configuração da API
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Temporariamente comentado para testar se resolve createContext error
        // manualChunks: (id) => {
        //   if (id.includes('node_modules')) {
        //     if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
        //       return 'vendor'
        //     }
        //     if (id.includes('wagmi') || id.includes('viem') || id.includes('@wagmi')) {
        //       return 'web3'
        //     }
        //     if (id.includes('lightweight-charts')) {
        //       return 'charts'
        //     }
        //     return 'vendor'
        //   }
        // },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
})
