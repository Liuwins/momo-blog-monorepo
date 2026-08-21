<template>
  <div v-if="videos.length" class="video-grid" :class="`grid-${count}`">
    <div
      v-for="(src, index) in videos"
      :key="index"
      class="video-item"
      :style="itemStyle(index)"
      @click="openFullscreen(index)"
    >
      <!-- preload="metadata" 让浏览器取首帧作封面，无需后端 ffmpeg -->
      <video
        v-if="!errorMap[index]"
        :ref="(el) => (videoRefs[index] = el)"
        :key="retryKey[index] || 0"
        :src="src"
        preload="metadata"
        playsinline
        webkit-playsinline
        muted
        class="video-thumb"
        @loadeddata="onLoaded(index)"
        @error="onThumbError(index)"
      />
      <!-- 封面未加载时的占位 -->
      <div v-if="!loaded[index] && !errorMap[index]" class="video-placeholder">
        <van-icon name="video-o" size="32" color="#c8c9cc" />
      </div>
      <!-- 播放按钮遮罩 -->
      <div v-if="!errorMap[index]" class="play-mask">
        <van-icon name="play-circle-o" size="40" color="#fff" />
      </div>
      <!-- 视频加载失败占位 -->
      <div v-if="errorMap[index]" class="video-error">
        <van-icon name="warning-o" size="28" color="#c8c9cc" />
        <span class="video-error-text">视频加载失败</span>
        <span class="video-error-retry" @click.stop="retryThumb(index)">重试</span>
      </div>
    </div>
  </div>

  <!-- 全屏播放弹层 -->
  <van-popup
    v-model:show="fullscreenShow"
    position="center"
    :style="{ width: '100%', height: '100%', background: '#000' }"
    :close-on-click-overlay="true"
    @closed="stopFullscreen"
  >
    <div class="fullscreen-wrap">
      <video
        v-if="fullscreenSrc && !fullscreenError"
        :key="fullscreenRetryKey"
        ref="fullscreenVideoRef"
        :src="fullscreenSrc"
        controls
        autoplay
        playsinline
        webkit-playsinline
        class="fullscreen-video"
        @error="onFullscreenError"
      />
      <div v-if="fullscreenError" class="fullscreen-error">
        <van-icon name="warning-o" size="40" color="#fff" />
        <span class="fullscreen-error-text">视频加载失败</span>
        <span class="fullscreen-error-retry" @click="retryFullscreen">重试</span>
      </div>
      <van-icon
        name="cross"
        size="24"
        color="#fff"
        class="close-btn"
        @click="fullscreenShow = false"
      />
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  videos: { type: Array, default: () => [] }
})

const count = computed(() => Math.min(props.videos.length, 9))
const loaded = ref({})
const videoRefs = ref({})
const fullscreenShow = ref(false)
const fullscreenSrc = ref('')
const fullscreenVideoRef = ref(null)
// 视频加载失败状态
const errorMap = ref({})
const retryKey = ref({})
const fullscreenError = ref(false)
const fullscreenRetryKey = ref(0)

function itemStyle(_index) {
  // 单视频时宽屏展示，多视频时方形网格
  if (props.videos.length === 1) {
    return { width: '100%', maxWidth: '360px' }
  }
  return {}
}

function onLoaded(index) {
  loaded.value[index] = true
}

function onThumbError(index) {
  errorMap.value[index] = true
}

function retryThumb(index) {
  errorMap.value[index] = false
  retryKey.value[index] = (retryKey.value[index] || 0) + 1
}

function onFullscreenError() {
  fullscreenError.value = true
}

function retryFullscreen() {
  fullscreenError.value = false
  fullscreenRetryKey.value++
}

function openFullscreen(index) {
  fullscreenError.value = false
  fullscreenSrc.value = props.videos[index]
  fullscreenShow.value = true
}

function stopFullscreen() {
  fullscreenSrc.value = ''
  fullscreenError.value = false
}
</script>

<style scoped>
.video-grid {
  display: grid;
  gap: 3px;
  width: 100%;
}

.video-grid.grid-1 {
  grid-template-columns: 1fr;
}

.video-grid:not(.grid-1) {
  grid-template-columns: repeat(3, 1fr);
}

.video-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  background: #000;
  cursor: pointer;
}

.video-grid.grid-1 .video-item {
  aspect-ratio: 16 / 9;
  max-width: 360px;
}

.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;
}

.play-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}

.play-mask :deep(.van-icon) {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}

.video-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f7f8fa;
  color: #969799;
  font-size: 12px;
  padding: 4px;
  text-align: center;
}

.video-error-text {
  font-size: 12px;
  color: #969799;
}

.video-error-retry {
  font-size: 12px;
  color: #1989fa;
  cursor: pointer;
  padding: 2px 8px;
}

.fullscreen-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

.fullscreen-error-retry {
  font-size: 14px;
  color: #1989fa;
  cursor: pointer;
  padding: 4px 16px;
  border: 1px solid #1989fa;
  border-radius: 4px;
}

.fullscreen-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  padding: 4px;
  cursor: pointer;
}
</style>
