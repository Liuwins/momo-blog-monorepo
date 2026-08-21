import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'
import { getUnreadCount } from '@/api/notification'
import { useUserStore } from './user'

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0)
  let socket = null

  function connect() {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return
    if (socket) return

    const token = userStore.token
    if (!token) return

    socket = io('/notifications', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000
    })

    // 收到新通知：未读数 +1
    socket.on('notification', () => {
      unreadCount.value++
    })

    // 收到未读数更新
    socket.on('unreadUpdate', (data) => {
      unreadCount.value = data.count
    })

    // 连接成功：重新同步未读数（断线期间可能错过通知）
    socket.on('connect', () => {
      fetchUnreadCount()
    })

    // 连接错误
    socket.on('connect_error', () => {
      // 静默处理，socket.io 会自动重连
    })

    // 断开连接
    socket.on('disconnect', () => {
      // socket.io 会自动重连
    })
  }

  function disconnect() {
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }
    unreadCount.value = 0
  }

  async function fetchUnreadCount() {
    try {
      const count = await getUnreadCount()
      unreadCount.value = count
    } catch {
      /* ignore */
    }
  }

  return { unreadCount, connect, disconnect, fetchUnreadCount }
})
