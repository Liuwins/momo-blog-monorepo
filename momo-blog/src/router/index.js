import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import(/* webpackPrefetch: true */ '@/views/Login.vue')
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import(/* webpackPrefetch: true */ '@/views/Publish.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import(/* webpackPrefetch: true */ '@/views/PostDetail.vue')
  },
  {
    path: '/profile/:id?',
    name: 'Profile',
    component: () => import(/* webpackPrefetch: true */ '@/views/Profile.vue')
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import(/* webpackPrefetch: true */ '@/views/Favorites.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  try {
    const userStore = useUserStore()
    if (to.meta.requiresAuth && !userStore.isLoggedIn) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
    if (to.path === '/login' && userStore.isLoggedIn) {
      return '/'
    }
  } catch (e) {
    console.error('[Router Guard]', e)
    toast.fail('导航出错，请重试')
    return false
  }
})

router.onError((error) => {
  console.error('[Router Error]', error)
  toast.fail('页面加载失败，请重试')
})

export default router
