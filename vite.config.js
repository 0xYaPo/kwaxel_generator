import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@multiversx/sdk-dapp/hooks': '@multiversx/sdk-dapp/out/react/hooks',
      '@multiversx/sdk-dapp/ui': '@multiversx/sdk-dapp/out/ui',
    }
  },
  optimizeDeps: {
    include: ['@multiversx/sdk-dapp']
  }
})
