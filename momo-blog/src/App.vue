<template>
  <van-config-provider :theme="isDark ? 'dark' : 'light'">
    <div class="page-container" :class="{ 'page-container--with-tab': showTabBar }">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
      <TabBar v-if="showTabBar" />
    </div>
  </van-config-provider>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { useTheme } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { isDark } = useTheme()

const showTabBar = computed(() => {
  if (!userStore.isLoggedIn) return false
  if (route.path === '/') return true
  if (route.path === '/publish') return true
  if (route.path.startsWith('/profile')) return true
  if (route.path.startsWith('/notifications')) return true
  return false
})

// 登录状态变化时连接/断开 WebSocket
watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      notificationStore.connect()
    } else {
      notificationStore.disconnect()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.page-container--with-tab {
  padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px));
}

/* 路由切换过渡：淡入淡出 + 轻微上移 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
