import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Em desenvolvimento o Vite faz o papel que o IIS fará em produção:
    // encaminhar /api para a API, mantendo tudo na mesma origem.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    css: false,
  },
});
