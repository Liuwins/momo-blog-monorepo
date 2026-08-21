// 主题管理：暗黑模式切换 + 持久化
import { ref } from 'vue'

const THEME_KEY = 'momo_theme'
const isDark = ref(false)

// 初始化：从 localStorage 读取，并应用到 html 元素
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light'
  isDark.value = saved === 'dark'
  applyTheme()
}

function applyTheme() {
  const root = document.documentElement
  if (isDark.value) {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.setAttribute('data-theme', 'light')
  }
}

export function useTheme() {
  return {
    isDark,
    toggleTheme() {
      isDark.value = !isDark.value
      localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light')
      applyTheme()
    }
  }
}
