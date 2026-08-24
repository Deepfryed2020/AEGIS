import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = {
  '/api': 'http://localhost:4000',
  '/health': 'http://localhost:4000',
  '/status': 'http://localhost:4000',
  '/metrics': 'http://localhost:4000'
};

export default defineConfig({
  server: {
    port: 5173,
    proxy
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    proxy
  },
  build: {
    emptyOutDir: false
  },
  plugins: [react()]
});
