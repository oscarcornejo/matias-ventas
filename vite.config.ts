import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Permite probar Mercado Pago en local a través de un túnel público (ver README).
    allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.trycloudflare.com'],
    // En desarrollo el navegador ve un solo origen: así la cookie de sesión funciona sin CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
