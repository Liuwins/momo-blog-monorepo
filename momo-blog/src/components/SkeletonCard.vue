<template>
  <div class="skeleton-card">
    <!-- 头部：头像 + 昵称 + 时间 -->
    <div class="sk-header">
      <div class="sk-avatar sk-shimmer"></div>
      <div class="sk-header-info">
        <div class="sk-line sk-nickname sk-shimmer"></div>
        <div class="sk-line sk-time sk-shimmer"></div>
      </div>
    </div>
    <!-- 内容区：多行文字 -->
    <div class="sk-content">
      <div class="sk-line sk-line-full sk-shimmer"></div>
      <div class="sk-line sk-line-full sk-shimmer"></div>
      <div class="sk-line sk-line-short sk-shimmer"></div>
    </div>
    <!-- 图片占位 -->
    <div class="sk-images">
      <div v-for="i in imgCount" :key="i" class="sk-image sk-shimmer"></div>
    </div>
    <!-- 操作栏 -->
    <div class="sk-actions">
      <div class="sk-action sk-shimmer"></div>
      <div class="sk-action sk-shimmer"></div>
      <div class="sk-action sk-shimmer"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  // 占位图片数量，默认 3 张
  imgCount: { type: Number, default: 3 }
})
</script>

<style scoped>
.skeleton-card {
  background: var(--bg-card);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.sk-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.sk-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.sk-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sk-header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.sk-line {
  height: 12px;
  border-radius: 4px;
}

.sk-nickname {
  width: 100px;
}

.sk-time {
  width: 60px;
  height: 10px;
}

.sk-content {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-line-full {
  width: 100%;
}

.sk-line-short {
  width: 60%;
}

.sk-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  margin-bottom: 10px;
}

.sk-image {
  aspect-ratio: 1;
  border-radius: 4px;
}

.sk-actions {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.sk-action {
  width: 50px;
  height: 20px;
  border-radius: 4px;
}
</style>
