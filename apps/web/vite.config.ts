import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Camera + WebXR need a secure context. On a phone in your LAN run: HTTPS=1 npm run dev
const https = process.env.HTTPS === '1';
const api = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), ...(https ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: api, changeOrigin: true },
      '/uploads': { target: api, changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 1600 },
});
