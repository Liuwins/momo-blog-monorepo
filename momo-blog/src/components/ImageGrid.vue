<template>
  <div v-if="images.length" class="image-grid" :class="`grid-${count}`">
    <div
      v-for="(img, index) in images"
      :key="index"
      class="image-item"
      @click="handlePreview(index)"
    >
      <van-image
        :src="getThumbUrl(img)"
        :style="itemStyle(index)"
        fit="cover"
        lazy-load
      >
        <template #error>
          <div class="img-error-slot">
            <van-icon name="photo-fail" size="32" color="#c8c9cc" />
          </div>
        </template>
      </van-image>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { showImagePreview } from 'vant'
import 'vant/es/image-preview/style'

const props = defineProps({
  images: { type: Array, default: () => [] }
})

const count = computed(() => Math.min(props.images.length, 9))

// 智能获取缩略图 URL
// 新格式：/images/<hash>/orig.webp -> /images/<hash>/thumb.webp
// 旧格式：/images/xxx.webp -> 原样返回（无多尺寸）
function getThumbUrl(url) {
  if (!url) return ''
  // 匹配 /images/<hash>/orig.<ext>
  const match = url.match(/^(\/images\/[^/]+\/)orig\.(webp|gif)$/)
  if (match) {
    return `${match[1]}thumb.${match[2] === 'gif' ? 'gif' : 'webp'}`
  }
  return url
}

// 原图 URL（预览用）
function getOrigUrl(url) {
  return url // images 数组里存的就是原图 URL
}

// 中图 URL（详情页用）
function getMidUrl(url) {
  if (!url) return ''
  const match = url.match(/^(\/images\/[^/]+\/)orig\.(webp|gif)$/)
  if (match) {
    return `${match[1]}mid.${match[2] === 'gif' ? 'gif' : 'webp'}`
  }
  return url
}

function itemStyle(_index) {
  if (props.images.length === 1) {
    return { width: '100%', maxWidth: '280px', height: 'auto', aspectRatio: '1' }
  }
  return {}
}

function handlePreview(index) {
  // 预览用原图
  showImagePreview({
    images: props.images.map(getOrigUrl),
    startPosition: index,
    closeable: true
  })
}
</script>

<style scoped>
.image-grid {
  display: grid;
  gap: 3px;
  width: 100%;
}

.image-grid.grid-1 {
  grid-template-columns: 1fr;
}

.image-grid:not(.grid-1) {
  grid-template-columns: repeat(3, 1fr);
}

.image-grid.grid-1 .image-item {
  max-width: 280px;
}

.image-item {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
}

.image-grid.grid-1 .image-item {
  aspect-ratio: auto;
}

.image-item :deep(.van-image) {
  width: 100%;
  height: 100%;
}

.image-item :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-error-slot {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page, #f7f8fa);
}
</style>
