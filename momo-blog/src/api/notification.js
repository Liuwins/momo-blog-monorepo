import request from './request'

export function getNotifications(params) {
  return request.get('/notifications', { params })
}

export function getUnreadCount() {
  return request.get('/notifications/unread-count')
}

export function markAllRead() {
  return request.post('/notifications/read-all')
}
