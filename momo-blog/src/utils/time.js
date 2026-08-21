import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export function formatRelativeTime(dateStr) {
  const date = dayjs(dateStr)
  if (!date.isValid()) return ''
  const diff = dayjs().diff(date, 'minute')
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff}分钟前`
  if (diff < 24 * 60) return `${Math.floor(diff / 60)}小时前`
  if (diff < 7 * 24 * 60) return `${Math.floor(diff / (24 * 60))}天前`
  return date.format('YYYY年M月D日')
}
