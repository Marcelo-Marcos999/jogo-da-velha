import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = dirname(fileURLToPath(import.meta.url))

// O three é a dependência do jogo (declarada no package.json).
// Em um ambiente com `npm install` feito, ele é resolvido normalmente do
// node_modules. Caso o pacote não esteja instalado, caímos para o build
// oficial via CDN, para que o projeto ainda compile e rode.
function isThreeInstalled() {
  try {
    createRequire(import.meta.url).resolve('three')
    return true
  } catch {
    return existsSync(resolve(root, 'node_modules/three/package.json'))
  }
}

const threeInstalled = isThreeInstalled()
const THREE_CDN = 'https://unpkg.com/three@0.160.0/build/three.module.js'

export default defineConfig({
  plugins: [react()],
  ...(threeInstalled
    ? {}
    : {
        resolve: {
          alias: {
            three: THREE_CDN,
          },
        },
        build: {
          rollupOptions: {
            external: [/^https?:\/\//],
          },
        },
      }),
})
