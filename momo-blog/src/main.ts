import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { installPlugins } from './plugins'
import { Lazyload } from 'vant'
import 'vant/es/lazyload/style'
import './styles/variables.css'
import { initTheme } from './utils/theme'
// import './mock'  // 已切换到真实后端，关闭 mock

// 初始化主题（暗黑模式持久化）
initTheme()

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.use(installPlugins)
app.use(Lazyload, { lazyComponent: true })
app.mount('#app')

// 生产环境注册轻量离线缓存，开发环境不接管 Vite 热更新资源。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service Worker 注册失败', error)
    })
  })
}
