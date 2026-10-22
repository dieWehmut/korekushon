// GitHub Pages serves 404.html for unknown paths. Copying index.html to
// 404.html lets BrowserRouter deep links fall back to the SPA instead of a
// GitHub 404 page.
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const indexFile = join(root, 'dist', 'index.html')
const notFoundFile = join(root, 'dist', '404.html')

if (!existsSync(indexFile)) {
  console.error('[copy-404] dist/index.html not found - run "vite build" first.')
  process.exit(1)
}

copyFileSync(indexFile, notFoundFile)
console.log('[copy-404] dist/index.html -> dist/404.html')
