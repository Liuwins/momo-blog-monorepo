import { describe, expect, it, vi } from 'vitest'
import { lazyLoad } from './lazy'

describe('lazyLoad', () => {
  it('首次 chunk 请求失败时只重试一次并返回组件', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient chunk failure'))
      .mockResolvedValue({ default: { name: 'Home' } })

    await expect(lazyLoad(loader, { delayMs: 0 })()).resolves.toEqual({ default: { name: 'Home' } })
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('超过重试次数后保留原始错误', async () => {
    const error = new Error('permanent chunk failure')
    const loader = vi.fn().mockRejectedValue(error)

    await expect(lazyLoad(loader, { retries: 1, delayMs: 0 })()).rejects.toBe(error)
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
