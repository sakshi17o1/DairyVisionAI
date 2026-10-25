import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = 'http://127.0.0.1:8000'
const proxy = Object.fromEntries(
  ['/analyze', '/chat', '/advice', '/api'].map((p) => [p, { target: backend, changeOrigin: true }])
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: true, allowedHosts: true, proxy },   // host:true -> reachable from phone on same Wi-Fi
  preview: { host: true, allowedHosts: true, proxy },
})
