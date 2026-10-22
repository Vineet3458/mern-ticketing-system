import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { VITE_BACKEND_URL } = loadEnv(mode, process.cwd(), '');
  const backendUrl = (VITE_BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return;
              console.warn('[vite] proxy error:', err.message);
            });
          },
        },
      },
    },
  };
});
