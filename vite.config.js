import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'src/pages/login.html'),
        signup: resolve(__dirname, 'src/pages/signup.html'),
        app: resolve(__dirname, 'src/pages/app.html')
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})