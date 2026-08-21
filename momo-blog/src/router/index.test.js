import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import router from '@/router'
import { useUserStore } from '@/stores/user'

describe('router access rules', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    if (router.currentRoute.value.path !== '/') {
      await router.replace('/')
    }
  })

  it('未登录访问发布页时跳转登录并保留目标地址', async () => {
    await router.push('/publish')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/publish')
  })

  it('有效会话可以进入发布页', async () => {
    localStorage.setItem('token_expires', String(Date.now() + 60_000))
    const userStore = useUserStore()
    userStore.token = 'test-token'

    await router.push('/publish')

    expect(router.currentRoute.value.name).toBe('Publish')
  })
})
