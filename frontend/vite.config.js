import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: true,
    outDir: '../frontend-dist',
    chunkSizeWarningLimit: '2000k'
  },

  plugins: [vue()]
});
