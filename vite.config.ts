import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pixcape-icon.svg', 'pixcape-og.svg'],
      manifest: {
        id: '/',
        name: 'Pixcape 我的世界皮肤工坊',
        short_name: 'Pixcape',
        description: 'Minecraft 风格皮肤、披肩、外套与披风预制编辑工坊。',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#18230f',
        theme_color: '#3f762e',
        icons: [
          { src: '/pixcape-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
      },
    }),
  ],
})
