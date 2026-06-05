import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The Express bridge server (gt/bd CLI -> HTTP/WS). Defaults match server.js.
const BACKEND_PORT = process.env.GASTOWN_PORT ?? '7667';
const BACKEND = `http://127.0.0.1:${BACKEND_PORT}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API + websocket to the existing Express backend during development.
    // A later phase adds a tmux PTY-over-websocket bridge under /ws — already routed here.
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/ws': { target: BACKEND, ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
