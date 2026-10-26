import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/worthit/',
    plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        id: '/worthit/',
        name: 'WorthIt — 이거 본전 뽑았나?',
        short_name: 'WorthIt',
        description: '내 소비의 사용 기록과 목표 사용단가를 관리해요.',
        lang: 'ko',
        start_url: '/worthit/',
        scope: '/worthit/',
        display: 'standalone',
        theme_color: '#059669',
        background_color: '#f8fafc',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'worthit',
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/worthit/index.html',
        navigateFallbackAllowlist: [/^\/worthit(?:\/|$)/],
        cleanupOutdatedCaches: true,
      },
    })],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
