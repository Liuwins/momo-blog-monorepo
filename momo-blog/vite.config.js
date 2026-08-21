import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Vite 配置不会自动把 .env 文件注入 process.env，显式加载后本地启动才会使用 .env.development。
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://localhost:3001'
  const siteUrl = (env.VITE_SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:5175').replace(/\/+$/, '')

  return {
    plugins: [
      vue(),
      Components({
        resolvers: [VantResolver()]
      }),
      {
        name: 'site-meta-url',
        transformIndexHtml(html) {
          return html.replace(/__SITE_URL__/g, () => siteUrl)
        }
      }
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5175,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/images': { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, changeOrigin: true, ws: true }
      }
    },
    build: {
      emptyOutDir: false
    },
    test: {
      environment: 'happy-dom',
      globals: true
    }
  }
})
