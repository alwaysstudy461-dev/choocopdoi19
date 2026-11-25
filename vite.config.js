import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/sitemap.xml': 'http://127.0.0.1:3000',
      '/sitemap-pages.xml': 'http://127.0.0.1:3000',
      '/sitemap-regions.xml': 'http://127.0.0.1:3000',
      '/sitemap-products.xml': 'http://127.0.0.1:3000',
      '/robots.txt': 'http://127.0.0.1:3000',
    },
  },
});
