import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_URL || "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_URL || "http://127.0.0.1:5000",
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Suppress noisy ECONNRESET / ECONNREFUSED when backend server restarts
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return;
            console.warn('[vite] proxy error:', err.message);
          });
        },
      },
    },
  },
});
