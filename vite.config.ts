import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// GitHub Pages project site is served from https://dieWehmut.github.io/korekushon/
// The app uses BrowserRouter, so an absolute sub-path base is required (not './')
// for deep links / refreshes to resolve assets correctly.
const base = '/korekushon/'


const assetsPath = '/src/assets' 

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@assets': assetsPath
    }
  },
  base,
  build: {
    sourcemap: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[ext]' 
      }
    }
  }
})
