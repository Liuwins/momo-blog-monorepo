<template>
  <div v-if="src" class="music-player" :class="{ playing: isPlaying, loading: isLoading }">
    <!-- 黑胶唱片 + 播放控制 -->
    <div class="player-main">
      <div class="vinyl-wrap" @click="togglePlay">
        <div class="vinyl" :class="{ spinning: isPlaying }">
          <div class="vinyl-grooves"></div>
          <div class="vinyl-label">
            <van-icon :name="isPlaying ? 'pause' : 'play'" size="16" color="#fff" />
          </div>
        </div>
        <div class="vinyl-tonearm" :class="{ active: isPlaying }"></div>
      </div>

      <div class="player-meta" @click="togglePlay">
        <div class="meta-title">
          <span class="track-name">{{ displayName }}</span>
          <div v-if="isPlaying" class="equalizer">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
        <div class="meta-status">
          <template v-if="isLoading">
            <span class="status-loading">加载中…</span>
          </template>
          <template v-else-if="isPlaying">
            <span class="status-time">{{ formatTime(currentTime) }}</span>
            <span class="status-sep">/</span>
            <span class="status-total">{{ formatTime(duration) }}</span>
          </template>
          <template v-else-if="hasError">
            <span class="status-error">加载失败，点击重试</span>
          </template>
          <template v-else>
            <span class="status-idle">点击播放</span>
          </template>
        </div>
      </div>

      <button class="loop-btn" :class="{ active: loop }" @click.stop="toggleLoop" aria-label="循环">
        <van-icon name="replay" size="15" />
      </button>
    </div>

    <!-- 进度条 -->
    <div class="progress-row">
      <div
        class="progress-track"
        ref="progressRef"
        @click="onSeek"
        @touchstart="onSeekStart"
        @touchmove="onSeekMove"
        @touchend="onSeekEnd"
      >
        <div class="progress-buffer" :style="{ width: bufferedPercent + '%' }"></div>
        <div class="progress-fill" :style="{ width: progressPercent + '%' }">
          <div class="progress-thumb"></div>
        </div>
      </div>
    </div>

    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      :loop="loop"
      @loadedmetadata="onLoadedMeta"
      @timeupdate="onTimeUpdate"
      @progress="onBuffered"
      @ended="onEnded"
      @error="onError"
      @waiting="isLoading = true"
      @canplay="onCanPlay"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { toast } from '@/utils/toast'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  autoPlay: { type: Boolean, default: false }
})

const audioRef = ref(null)
const progressRef = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isLoading = ref(false)
const hasError = ref(false)
const buffered = ref(0)
const loop = ref(true)
const isSeeking = ref(false)

const displayName = computed(() => {
  if (props.name) return props.name
  try {
    const url = new URL(props.src, window.location.origin)
    const filename = url.pathname.split('/').pop() || '背景音乐'
    return decodeURIComponent(filename.replace(/\.[^.]+$/, ''))
  } catch {
    return '背景音乐'
  }
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

const bufferedPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (buffered.value / duration.value) * 100)
})

function togglePlay() {
  if (!audioRef.value || hasError.value) {
    // 出错后点击重试
    if (hasError.value && audioRef.value) {
      hasError.value = false
      audioRef.value.load()
    }
    return
  }
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play().catch(() => {
      // 浏览器自动播放策略拦截，静默处理
      if (props.autoPlay) return
      toast.fail('播放失败，可能是不支持的格式')
    })
  }
}

function toggleLoop() {
  loop.value = !loop.value
  if (audioRef.value) {
    audioRef.value.loop = loop.value
  }
  toast.info(loop.value ? '单曲循环已开启' : '单曲循环已关闭')
}

function onLoadedMeta() {
  duration.value = audioRef.value?.duration || 0
  isLoading.value = false
  hasError.value = false
  if (props.autoPlay) {
    audioRef.value?.play().catch(() => {})
  }
}

function onCanPlay() {
  isLoading.value = false
}

function onTimeUpdate() {
  if (isSeeking.value) return
  currentTime.value = audioRef.value?.currentTime || 0
}

function onBuffered() {
  const audio = audioRef.value
  if (!audio || !audio.buffered.length) return
  buffered.value = audio.buffered.end(audio.buffered.length - 1)
}

function onEnded() {
  if (!loop.value) {
    isPlaying.value = false
    currentTime.value = 0
  }
}

function onError() {
  isPlaying.value = false
  isLoading.value = false
  hasError.value = true
}

// ===== 拖拽进度 =====
function getPercentFromEvent(e) {
  if (!progressRef.value || !duration.value) return null
  const rect = progressRef.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return percent
}

function onSeek(e) {
  const percent = getPercentFromEvent(e)
  if (percent === null || !audioRef.value) return
  audioRef.value.currentTime = percent * duration.value
  currentTime.value = audioRef.value.currentTime
}

function onSeekStart(e) {
  isSeeking.value = true
  const percent = getPercentFromEvent(e)
  if (percent !== null) {
    currentTime.value = percent * duration.value
  }
}

function onSeekMove(e) {
  if (!isSeeking.value) return
  const percent = getPercentFromEvent(e)
  if (percent !== null) {
    currentTime.value = percent * duration.value
  }
}

function onSeekEnd(e) {
  if (!isSeeking.value) return
  const percent = getPercentFromEvent(e)
  if (percent !== null && audioRef.value) {
    audioRef.value.currentTime = percent * duration.value
  }
  isSeeking.value = false
}

// src 变化时重置状态
watch(
  () => props.src,
  () => {
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    buffered.value = 0
    hasError.value = false
    isLoading.value = true
  }
)

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
})

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.music-player {
  --vinyl-size: 48px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 12px 14px 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
}

.music-player.playing {
  box-shadow: 0 4px 20px rgba(7, 193, 96, 0.12);
}

/* ===== 主区域：唱片 + 信息 + 循环 ===== */
.player-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ===== 黑胶唱片 ===== */
.vinyl-wrap {
  position: relative;
  flex-shrink: 0;
  width: var(--vinyl-size);
  height: var(--vinyl-size);
  cursor: pointer;
}

.vinyl {
  width: var(--vinyl-size);
  height: var(--vinyl-size);
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    #3a3a3a 0%,
    #1a1a1a 40%,
    #0a0a0a 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease;
}

.vinyl-wrap:active .vinyl {
  transform: scale(0.93);
}

.vinyl.spinning {
  animation: vinyl-spin 6s linear infinite;
}

@keyframes vinyl-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 唱片纹理 */
.vinyl-grooves {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle,
    transparent 0,
    transparent 2px,
    rgba(255, 255, 255, 0.03) 2px,
    rgba(255, 255, 255, 0.03) 3px
  );
}

/* 中心标签 */
.vinyl-label {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-color), var(--theme-color-light));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
  z-index: 1;
}

/* 唱针 */
.vinyl-tonearm {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 18px;
  height: 2px;
  background: linear-gradient(to right, #999, #666);
  border-radius: 1px;
  transform-origin: right center;
  transform: rotate(-25deg);
  transition: transform 0.4s ease;
  z-index: 2;
}

.vinyl-tonearm.active {
  transform: rotate(0deg);
}

.vinyl-tonearm::after {
  content: '';
  position: absolute;
  right: -2px;
  top: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #555;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* ===== 信息区 ===== */
.player-meta {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.meta-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* 均衡器动画 */
.equalizer {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 13px;
  flex-shrink: 0;
}

.equalizer span {
  width: 2.5px;
  height: 100%;
  background: var(--theme-color);
  border-radius: 1px;
  animation: eq-bounce 0.8s ease-in-out infinite alternate;
}

.equalizer span:nth-child(1) { animation-delay: 0s; }
.equalizer span:nth-child(2) { animation-delay: 0.15s; }
.equalizer span:nth-child(3) { animation-delay: 0.3s; }
.equalizer span:nth-child(4) { animation-delay: 0.45s; }

@keyframes eq-bounce {
  0% { height: 30%; }
  100% { height: 100%; }
}

.meta-status {
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 3px;
  line-height: 1.4;
}

.status-time {
  color: var(--theme-color);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.status-sep {
  opacity: 0.5;
}

.status-error {
  color: #ee0a24;
}

.status-loading {
  color: var(--text-light);
}

.status-loading::after {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 4px;
  border: 1.5px solid var(--text-lighter);
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spinner 0.6s linear infinite;
  vertical-align: middle;
}

@keyframes spinner {
  to { transform: rotate(360deg); }
}

/* ===== 循环按钮 ===== */
.loop-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--bg-tag);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.loop-btn:active {
  transform: scale(0.9);
}

.loop-btn.active {
  background: var(--bg-tag-active);
  color: var(--theme-color);
}

/* ===== 进度条 ===== */
.progress-row {
  margin-top: 10px;
  padding: 0 2px;
}

.progress-track {
  position: relative;
  height: 22px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.progress-track::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: var(--border-color);
}

.progress-buffer {
  position: absolute;
  left: 0;
  height: 3px;
  border-radius: 2px;
  background: var(--text-lighter);
  opacity: 0.4;
  transition: width 0.3s ease;
}

.progress-fill {
  position: absolute;
  left: 0;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--theme-color), var(--theme-color-light));
  transition: width 0.15s linear;
}

.progress-thumb {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--theme-color);
  box-shadow: 0 1px 4px rgba(7, 193, 96, 0.4);
  transition: transform 0.2s ease;
}

.progress-track:active .progress-thumb,
.music-player.playing .progress-thumb {
  transform: translateY(-50%) scale(1);
}

/* ===== 加载态 ===== */
.music-player.loading .vinyl-label {
  opacity: 0.5;
}

.music-player.loading .vinyl {
  animation: none;
}
</style>
