import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 允许局域网访问
    port: 5174,
    allowedHosts: ['localhost', '.cpolar.cn', '.trycloudflare.com'],  // 允许穿透域名访问
    hmr: {
      host: 'localhost',  // HMR 只在本地生效
      protocol: 'ws'
    }
  }
})
