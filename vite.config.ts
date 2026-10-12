import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Precarga la fuente en el HTML.
 *
 * Sin esto el navegador solo descubre el woff2 después de descargar y parsear el CSS,
 * que a su vez espera al bundle: medido en Slow 4G, la fuente partía recién a los 3,0 s
 * y provocaba un salto de maquetación al llegar. La precarga la pide en paralelo.
 *
 * El nombre del archivo lleva un hash que Vite asigna al construir, así que se busca en
 * el bundle en vez de escribirlo a mano.
 */
function preloadFont(): Plugin {
  let href: string | null = null;

  return {
    name: 'mati-preload-font',
    apply: 'build',
    generateBundle(_options, bundle) {
      const asset = Object.keys(bundle).find(
        (name) => name.includes('plus-jakarta-sans') && name.endsWith('.woff2'),
      );
      href = asset ? `/${asset}` : null;
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        if (!href) return [];
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'font',
              type: 'font/woff2',
              href,
              crossorigin: '',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadFont()],
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
