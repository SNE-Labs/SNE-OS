import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Otimizações para mobile-first
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React (compartilhado)
          'react-vendor': ['react', 'react-dom'],

          // Web3 libraries (compartilhado - sempre carregado)
          'web3-core': ['wagmi', 'viem'],

          // UI components (compartilhado)
          'ui-core': ['lucide-react', 'clsx', 'tailwind-merge'],

          // Desktop-specific chunks
          'desktop-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover'
          ],
          'desktop-charts': ['recharts', 'd3-array', 'd3-scale'],

          // Mobile-specific chunks (lazy loaded)
          'mobile-animations': ['framer-motion'],
          'mobile-gestures': ['@use-gesture/react'],

          // Heavy pages (lazy loaded)
          'page-radar': ['./src/app/pages/Radar'],
          'page-vault': ['./src/app/pages/Vault'],

        },
        // Nomes de arquivos otimizados
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';

          // Mobile chunks têm prioridade menor
          if (chunkInfo.name?.includes('mobile')) {
            return `assets/mobile-${facadeModuleId}-[hash].js`;
          }
          if (chunkInfo.name?.includes('desktop')) {
            return `assets/desktop-${facadeModuleId}-[hash].js`;
          }

          return `assets/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/styles-[hash].css';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Otimizações de build
    minify: 'esbuild',
    // Source maps apenas em development
    sourcemap: process.env.NODE_ENV !== 'production',
    // Target moderno para melhor performance
    target: 'esnext',
    // CSS code splitting
    cssCodeSplit: true
  },
  // Preload de chunks críticos
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wagmi',
      'viem',
      'lucide-react'
    ],
    exclude: [
      // Excluir mobile libraries do preload inicial
      'framer-motion',
      '@use-gesture/react'
    ]
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        // Remove /api prefix when proxying
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
