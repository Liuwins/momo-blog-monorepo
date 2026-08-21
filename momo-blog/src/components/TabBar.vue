<template>
  <van-tabbar v-model="active" route>
    <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
    <!-- 单用户系统：发布、通知仅管理员可见 -->
    <van-tabbar-item v-if="userStore.isLoggedIn" icon="add-o" @click="handlePublish"
      >发布</van-tabbar-item
    >
    <van-tabbar-item
      v-if="userStore.isLoggedIn"
      icon="bell-o"
      to="/notifications"
      :badge="unreadCount || ''"
      >通知</van-tabbar-item
    >
    <van-tabbar-item icon="user-o" :to="profilePath">我的</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { getOwnerProfile } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const unreadCount = computed(() => notificationStore.unreadCount)

const active = computed({
  get() {
    const path = router.currentRoute.value.path
    if (path === '/') return 0
    if (path === '/publish') return 1
    if (path.startsWith('/notifications')) return 2
    if (path.startsWith('/profile')) return 3
    return 0
  },
  set() {}
})

// 单用户系统：管理员→自己的资料页；游客→博主资料页（无需登录）
const ownerId = ref(null)
const profilePath = computed(() => {
  if (userStore.isLoggedIn) {
    const id = userStore.userInfo?.id
    return id ? `/profile/${id}` : '/profile'
  }
  // 游客：跳转博主资料页，先用 owner 接口拿到 id
  return ownerId.value ? `/profile/${ownerId.value}` : '/profile'
})

onMounted(async () => {
  if (userStore.isLoggedIn) {
    notificationStore.fetchUnreadCount()
  } else {
    // 游客：获取博主 ID 以便"我的"跳转到博主资料页
    try {
      const owner = await getOwnerProfile()
      if (owner?.id) ownerId.value = owner.id
    } catch {
      /* ignore */
    }
  }
})

function handlePublish() {
  if (userStore.isLoggedIn) {
    router.push('/publish')
  } else {
    router.push({ path: '/login', query: { redirect: '/publish' } })
  }
}
</script>
