<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="not-found-code">404</div>
      <div class="not-found-text">页面不存在</div>
      <div class="not-found-desc">你访问的页面可能已被删除或暂时不可用</div>
      <van-button type="primary" color="#07C160" round class="not-found-btn" @click="router.push('/')">
        返回首页
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.not-found-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
}

.not-found-content {
  text-align: center;
  padding: 40px;
}

.not-found-code {
  font-size: 80px;
  font-weight: 700;
  color: var(--theme-color);
  line-height: 1;
}

.not-found-text {
  font-size: 18px;
  color: var(--text-primary);
  margin-top: 12px;
  font-weight: 500;
}

.not-found-desc {
  font-size: 14px;
  color: var(--text-light);
  margin-top: 8px;
}

.not-found-btn {
  margin-top: 32px;
  padding: 0 32px;
}
</style>
