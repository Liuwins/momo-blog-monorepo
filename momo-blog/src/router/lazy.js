/**
 * 路由懒加载的轻量重试包装。
 *
 * 首次请求 chunk 可能因为网络抖动、Vite 首次依赖优化或部署后缓存切换失败；
 * 只重试一次，最终仍失败时交给 router.onError 展示明确错误，不会无限请求。
 */
export function lazyLoad(loader, options = {}) {
  const retries = Math.max(0, Number(options.retries ?? 1))
  const delayMs = Math.max(0, Number(options.delayMs ?? 120))

  return async () => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await loader()
      } catch (error) {
        if (attempt >= retries) throw error
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }
  }
}
