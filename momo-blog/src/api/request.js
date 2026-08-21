import axios from 'axios'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 防止 401/403 时重复跳转登录页
let isRedirecting = false

function redirectToLogin() {
  if (isRedirecting) return
  isRedirecting = true
  const redirect = router.currentRoute.value.fullPath
  router.push({ path: '/login', query: { redirect } }).finally(() => {
    isRedirecting = false
  })
}

// 延迟获取 user store 实例（避免 Pinia 初始化顺序问题）
let userStoreInstance = null
function getUserStore() {
  if (!userStoreInstance) {
    try {
      userStoreInstance = useUserStore()
    } catch (e) {
      return null
    }
  }
  return userStoreInstance
}

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const res = response.data

    // 直接放行 success/boolean（如删除返回 true）
    if (res === true || res === false || res === 'success') {
      return res
    }

    // 数组直接放行（标签列表等）
    if (Array.isArray(res)) {
      return res
    }

    // 数字/字符串直接放行（如未读数、待审核数）
    if (typeof res === 'number' || typeof res === 'string') {
      return res
    }

    // 后端直接返回数据对象（无包装）
    if (res && typeof res === 'object') {
      // 以下字段视为有效响应，直接放行
      const passKeys = [
        'list',
        'token',
        'id',
        'url',
        'urls',
        'liked',
        'comment',
        'post',
        'user',
        'message',
        'total'
      ]
      if (passKeys.some((k) => k in res)) {
        return res
      }
    }

    // 兼容旧格式
    if (res && res.code === 200) {
      return res.data
    }
    if (res && res.code === 401) {
      handleAuthError('登录已过期，请重新登录')
    } else if (res && res.code === 403) {
      handleAuthError('请先登录')
    } else if (res && res.message) {
      toast.fail(res.message)
    } else {
      toast.fail('请求失败')
    }
    return Promise.reject(new Error(res?.message || 'Request Error'))
  },
  (error) => {
    // 优先透出后端返回的具体错误信息（如"不支持的音频类型""文件超过大小限制"），便于排查
    const serverMsg = error.response?.data?.message
    const serverMsgText = Array.isArray(serverMsg) ? serverMsg.join('；') : serverMsg
    if (error.response?.status === 401) {
      handleAuthError(serverMsgText || '登录已过期，请重新登录')
    } else if (error.response?.status === 403) {
      // 403 可能是权限不足（如"仅管理员可操作"），仅在无 token 时才强制跳转登录
      if (localStorage.getItem('token')) {
        toast.fail(serverMsgText || '没有权限执行此操作')
      } else {
        handleAuthError(serverMsgText || '请先登录')
      }
    } else {
      toast.fail(serverMsgText || '网络异常，请检查网络连接')
    }
    // 标记已提示，避免业务层 catch 再弹一次重复 toast
    error.__toasted = true
    return Promise.reject(error)
  }
)

/**
 * 统一处理认证失败：清空 store + localStorage，跳转登录页
 */
function handleAuthError(message) {
  try {
    // 同步清理 user store 状态（避免 UI 与实际登录态不一致）
    const store = getUserStore()
    if (store) store.logout()
  } catch (e) {
    // 降级：直接清 localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('token_expires')
    localStorage.removeItem('user_info')
  }
  toast.fail(message)
  redirectToLogin()
}

export default request
