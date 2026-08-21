/**
 * 统一 Toast 工具
 * 所有页面/拦截器都通过此模块提示，保证样式一致（毛玻璃 + 图标 + 去重）
 *
 * 用法：
 *   import { toast } from '@/utils/toast'
 *   toast.success('已删除')
 *   toast.fail('删除失败')
 *   toast.info('暂无数据')
 */
import { showToast } from 'vant'

// 同一消息 1.5s 内不重复弹
let lastMsg = ''
let lastTime = 0

const ICON_MAP = {
  success: 'success',
  fail: 'cross',
  info: 'info-o'
}

function fire(type, message, options = {}) {
  if (!message) return
  const now = Date.now()
  if (message === lastMsg && now - lastTime < 1500) return
  lastMsg = message
  lastTime = now

  showToast({
    type: 'text',
    icon: ICON_MAP[type] || '',
    message,
    duration: options.duration || 2500,
    position: options.position || 'center',
    transition: 'van-toast-fade',
    className: `custom-toast custom-toast--${type}`
  })
}

export const toast = {
  success: (msg, opts) => fire('success', msg, opts),
  fail: (msg, opts) => fire('fail', msg, opts),
  info: (msg, opts) => fire('info', msg, opts)
}
