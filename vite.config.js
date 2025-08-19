import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        'react', 
        'react-dom',
        '@multiversx/sdk-dapp',
        '@multiversx/sdk-dapp/hooks',
        '@multiversx/sdk-dapp/ui'
      ],
    },
  },
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom',
      '@multiversx/sdk-dapp': '@multiversx/sdk-dapp'
    }
  },
  optimizeDeps: {
    include: ['@multiversx/sdk-dapp']
  }
})
