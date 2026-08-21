import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

/**
 * 全局背景音乐状态。
 *
 * 音频元素由 App.vue 持有，页面组件只负责调用这里的控制方法。
 * 这样路由切换时页面组件可以销毁，但音频节点和播放进度不会被销毁。
 */
export const useBackgroundMusicStore = defineStore('backgroundMusic', () => {
  const src = ref('')
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const hasError = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const buffered = ref(0)
  const loop = ref(true)
  const audioElement = shallowRef(null)

  // 首次进入页面时尝试自动播放；用户手动暂停后不会在路由切换时自动恢复。
  let autoplayRequested = false

  function resetProgress() {
    isPlaying.value = false
    isLoading.value = false
    hasError.value = false
    currentTime.value = 0
    duration.value = 0
    buffered.value = 0
  }

  function applySource() {
    const audio = audioElement.value
    if (!audio) return

    audio.pause()
    resetProgress()

    if (!src.value) {
      audio.removeAttribute('src')
      audio.load()
      return
    }

    isLoading.value = true
    audio.src = src.value
    audio.loop = loop.value
    audio.load()

    if (autoplayRequested) {
      audio.play().catch(() => {
        // 浏览器自动播放策略拦截时，保留静默状态，等待用户点击播放。
      })
    }
  }

  function attachAudio(audio) {
    audioElement.value = audio
    audio.loop = loop.value
    if (src.value) applySource()
  }

  function detachAudio(audio) {
    if (audioElement.value === audio) {
      audioElement.value = null
    }
  }

  function setTrack(nextSrc, options = {}) {
    const normalized = (nextSrc || '').trim()
    const autoPlay = Boolean(options.autoPlay)

    // 同一首歌不重新 load，保证跨页面时播放进度和暂停状态都保留。
    if (normalized === src.value) return

    src.value = normalized
    autoplayRequested = autoPlay
    applySource()
  }

  function clearTrack() {
    autoplayRequested = false
    if (!src.value) return
    src.value = ''
    applySource()
  }

  function play() {
    if (!src.value) return
    autoplayRequested = true
    const audio = audioElement.value
    if (!audio) return
    audio.play().then(() => {
      autoplayRequested = false
    }).catch(() => {
      // 自动播放或格式不支持时由页面控件继续提供重试入口。
    })
  }

  function pause() {
    autoplayRequested = false
    audioElement.value?.pause()
  }

  function toggle() {
    if (isPlaying.value) pause()
    else play()
  }

  function retry() {
    if (!src.value) return
    hasError.value = false
    autoplayRequested = true
    applySource()
  }

  function toggleLoop() {
    loop.value = !loop.value
    if (audioElement.value) audioElement.value.loop = loop.value
  }

  function seek(percent) {
    const audio = audioElement.value
    if (!audio || !duration.value) return
    const safePercent = Math.max(0, Math.min(1, percent))
    audio.currentTime = safePercent * duration.value
    currentTime.value = audio.currentTime
  }

  function onLoadedMetadata() {
    duration.value = audioElement.value?.duration || 0
    isLoading.value = false
    hasError.value = false
    if (autoplayRequested) play()
  }

  function onTimeUpdate() {
    currentTime.value = audioElement.value?.currentTime || 0
  }

  function onProgress() {
    const audio = audioElement.value
    if (!audio || !audio.buffered.length) return
    buffered.value = audio.buffered.end(audio.buffered.length - 1)
  }

  function onWaiting() {
    isLoading.value = true
  }

  function onCanPlay() {
    isLoading.value = false
  }

  function onPlay() {
    isPlaying.value = true
    autoplayRequested = false
  }

  function onPause() {
    isPlaying.value = false
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

  return {
    src,
    isPlaying,
    isLoading,
    hasError,
    currentTime,
    duration,
    buffered,
    loop,
    audioElement,
    attachAudio,
    detachAudio,
    setTrack,
    clearTrack,
    play,
    pause,
    toggle,
    retry,
    toggleLoop,
    seek,
    onLoadedMetadata,
    onTimeUpdate,
    onProgress,
    onWaiting,
    onCanPlay,
    onPlay,
    onPause,
    onEnded,
    onError
  }
})
