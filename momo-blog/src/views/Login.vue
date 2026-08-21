<template>
  <div class="login-page">
    <div class="login-header">
      <h1 class="app-title">MomoBlog</h1>
      <p class="app-desc">记录生活，分享美好</p>
      <p class="login-note">本站为个人空间，仅博主本人可登录，访客可自由浏览内容</p>
    </div>

    <van-form class="login-form" @submit="handleLogin">
      <van-cell-group inset>
        <van-field
          v-model="username"
          label="账号"
          placeholder="请输入账号"
          maxlength="20"
          :rules="[
            { required: true, message: '请输入账号' },
            { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '账号为3-20位字母、数字或下划线' }
          ]"
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="请输入密码"
          maxlength="50"
          :rules="[
            { required: true, message: '请输入密码' },
            { pattern: /^.{6,50}$/, message: '密码至少6位' }
          ]"
          @keypress.enter="handleLogin"
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          color="#07C160"
          :loading="loading"
        >
          登录
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (loading.value) return
  loading.value = true
  try {
    await userStore.loginAction(username.value, password.value)
    toast.success('登录成功')
    // 校验 redirect 参数，防止开放重定向攻击
    const redirect = route.query.redirect
    const safeRedirect =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : '/'
    router.replace(safeRedirect)
  } catch (e) {
    toast.fail(e?.message || '账号或密码错误')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  padding: 60px 16px 0;
  background: var(--bg-card);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-title {
  font-size: 28px;
  color: var(--theme-color);
  margin-bottom: 8px;
}

.app-desc {
  font-size: 14px;
  color: var(--text-light);
}

.login-note {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-light);
  opacity: 0.8;
}

.login-form {
  margin-bottom: 24px;
}
</style>
