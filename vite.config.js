import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Surge отдаёт 200.html на любой неизвестный путь — так работают прямые ссылки на страницы SPA
function spaFallback() {
  let outDir
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '200.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
