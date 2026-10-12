import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// La landing se sirve desde la app Next.js: el build va a ../public/home
// y src/proxy.ts reescribe "/" a /home/index.html para quien no inició sesión.
export default defineConfig({
  base: '/home/',
  build: {
    outDir: resolve(import.meta.dirname, '../public/home'),
    emptyOutDir: true,
  },
})
