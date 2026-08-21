import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from './user'
import { getUserInfo, login } from '@/api/user'

vi.mock('@/api/user', () => ({
  login: vi.fn(),
  getUserInfo: vi.fn()
}))

describe('user store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('登录后持久化 token 和用户资料', async () => {
    login.mockResolvedValue({ token: 'token-1', user: { id: 1, nickname: '博主' } })
    const store = useUserStore()

    await store.loginAction('admin', 'password')

    expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'password' })
    expect(store.isLoggedIn).toBe(true)
    expect(JSON.parse(localStorage.getItem('user_info'))).toEqual({ id: 1, nickname: '博主' })
    expect(localStorage.getItem('token')).toBe('token-1')
  })

  it('刷新时恢复有效会话，并可拉取最新资料', async () => {
    localStorage.setItem('token', 'restored-token')
    localStorage.setItem('token_expires', String(Date.now() + 60_000))
    localStorage.setItem('user_info', JSON.stringify({ id: 1, nickname: '旧昵称' }))
    getUserInfo.mockResolvedValue({ id: 1, nickname: '新昵称' })
    const store = useUserStore()

    expect(store.isLoggedIn).toBe(true)
    await store.fetchUserInfo(1)

    expect(getUserInfo).toHaveBeenCalledWith(1)
    expect(store.userInfo.nickname).toBe('新昵称')
    expect(JSON.parse(localStorage.getItem('user_info')).nickname).toBe('新昵称')
  })

  it('过期会话检查会清理本地凭据', () => {
    localStorage.setItem('token', 'expired-token')
    localStorage.setItem('token_expires', String(Date.now() - 1))
    localStorage.setItem('user_info', JSON.stringify({ id: 1 }))
    const store = useUserStore()

    expect(store.isLoggedIn).toBe(false)
    expect(store.checkTokenExpiry()).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
    expect(store.userInfo).toBeNull()
  })
})
