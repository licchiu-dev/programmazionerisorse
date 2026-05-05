import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base '/' per Vercel; se usi GitHub Pages con subpath, cambia in '/programmazionerisorse/'
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdf:    ['jspdf', 'html2canvas'],
          utils:  ['date-fns', 'uuid'],
        }
      }
    }
  }
})
