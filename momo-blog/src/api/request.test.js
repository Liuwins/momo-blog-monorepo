import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import request from './request'
import { toast } from '@/utils/toast'
import router from '@/router'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'

vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { fullPath: '/private' } },
    push: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('@/utils/toast', () => ({
  toast: {
    fail: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  }
}))

describe('request client', () => {
  const originalAdapter = request.defaults.adapter

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    request.defaults.adapter = originalAdapter
  })

  it('附带 JWT，并保留统一列表响应', async () => {
    localStorage.setItem('token', 'test-token')
    let capturedConfig
    request.defaults.adapter = async (config) => {
      capturedConfig = config
      return {
        data: { list: [{ id: 1 }], total: 1 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
    }

    const result = await request.get('/posts')

    expect(capturedConfig.headers.Authorization).toBe('Bearer test-token')
    expect(result).toEqual({ list: [{ id: 1 }], total: 1 })
  })

  it('透传数组和原始布尔响应', async () => {
    request.defaults.adapter = async (config) => ({
      data: true,
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    })

    await expect(request.delete('/posts/1')).resolves.toBe(true)
  })

  it('网络错误保留后端文案并标记已提示', async () => {
    request.defaults.adapter = async () => {
      const error = new Error('server error')
      error.response = { status: 503, data: { message: '服务暂不可用' } }
      throw error
    }

    await expect(request.get('/health')).rejects.toMatchObject({ __toasted: true })
    expect(toast.fail).toHaveBeenCalledWith('服务暂不可用')
  })

  it('401 会清理会话并只跳转一次登录页', async () => {
    localStorage.setItem('token', 'expired-token')
    localStorage.setItem('token_expires', String(Date.now() + 60_000))
    localStorage.setItem('user_info', JSON.stringify({ id: 1 }))
    useUserStore()
    request.defaults.adapter = async () => {
      const error = new Error('unauthorized')
      error.response = { status: 401, data: { message: '登录已过期' } }
      throw error
    }

    await expect(request.get('/private')).rejects.toMatchObject({ __toasted: true })

    expect(localStorage.getItem('token')).toBeNull()
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/private' }
    })
  })
})
