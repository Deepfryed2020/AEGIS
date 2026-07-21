import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      '/status': 'http://localhost:4000',
      '/metrics': 'http://localhost:4000'
    }
  },
  plugins: [react()]
});
