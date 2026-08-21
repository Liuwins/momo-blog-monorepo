import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getUserInfo } from '@/api/user'

const TOKEN_KEY = 'token'
const TOKEN_EXPIRES_KEY = 'token_expires'
const USER_INFO_KEY = 'user_info'
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000

// 从 localStorage 恢复 userInfo（刷新后不丢失）
function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref(loadStoredUser())

  // computed 必须是纯函数，不能有副作用
  const isLoggedIn = computed(() => {
    if (!token.value) return false
    const expires = localStorage.getItem(TOKEN_EXPIRES_KEY)
    if (expires && Date.now() > Number(expires)) return false
    return true
  })

  /**
   * 主动检查 token 是否过期，若过期则执行登出
   * 在路由守卫、App.vue onMounted、定时器中调用
   */
  function checkTokenExpiry() {
    if (!token.value) return false
    const expires = localStorage.getItem(TOKEN_EXPIRES_KEY)
    if (expires && Date.now() > Number(expires)) {
      logout()
      return false
    }
    return true
  }

  async function loginAction(username, password) {
    const res = await login({ username, password })
    setToken(res.token)
    userInfo.value = res.user
    persistUser()
    return res
  }

  function setToken(t) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(TOKEN_EXPIRES_KEY, String(Date.now() + TOKEN_TTL))
  }

  function persistUser() {
    if (userInfo.value) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo.value))
    }
  }

  async function fetchUserInfo(id) {
    const res = await getUserInfo(id)
    userInfo.value = res
    persistUser()
    return res
  }

  function setUserInfo(info) {
    userInfo.value = info
    persistUser()
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRES_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    loginAction,
    fetchUserInfo,
    setUserInfo,
    logout,
    checkTokenExpiry
  }
})
