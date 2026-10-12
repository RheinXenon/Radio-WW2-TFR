import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import radioResources from './plugins/resources.js'
import neteaseImport from './plugins/netease.js'
import extImport from './plugins/ext.js'

export default defineConfig({
  plugins: [react(), radioResources(), neteaseImport(), extImport()],
  server: {
    host: true, // 监听所有网卡，局域网设备可经 http://<本机IP>:5173 访问
    port: 5173,
    watch: { ignored: ['**/public/gen/**'] },
  },
  build: { chunkSizeWarningLimit: 2500 },
  preview: {
    host: true,
    port: 4173,
  },
})
