<template>
  <van-tabbar v-model="active" route>
    <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
    <!-- 单用户系统：发布、通知仅管理员可见 -->
    <van-tabbar-item v-if="userStore.isLoggedIn" icon="add-o" @click="handlePublish"
      >发布</van-tabbar-item
    >
    <van-tabbar-item
      v-if="userStore.isLoggedIn"
      class="notification-tab"
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

<style scoped>
/* 统一为轻量底栏，避免图标和文字挤在同一条基线。 */
:deep(.van-tabbar) {
  height: calc(58px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
  box-shadow: 0 -4px 16px rgba(38, 51, 45, 0.05);
}

:deep(.van-tabbar-item) {
  color: var(--text-light);
  font-size: 11px;
  gap: 2px;
}

:deep(.van-tabbar-item--active) {
  color: var(--theme-color);
  font-weight: 600;
}

:deep(.van-tabbar-item__icon) {
  margin-bottom: 1px;
  font-size: 21px;
}

/* Vant 默认角标会跟随图标底部间距下移，在窄屏底栏上容易压住“通知”文字。 */
.notification-tab :deep(.van-badge--fixed) {
  z-index: 2;
  top: -4px;
  right: -6px;
  margin-top: 0;
}
</style>
