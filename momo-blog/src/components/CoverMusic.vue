<template>
  <div v-if="src" class="cover-music" @click.stop="togglePlay">
    <div class="music-disc" :class="{ spinning: isPlaying, playing: isPlaying }">
      <div class="disc-grooves"></div>
      <div class="disc-label">
        <svg v-if="isPlaying" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="1.5" y="1" width="2" height="8" rx="0.5" fill="#fff"/>
          <rect x="6.5" y="1" width="2" height="8" rx="0.5" fill="#fff"/>
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 1 L9 5 L2.5 9 Z" fill="#fff"/>
        </svg>
      </div>
    </div>

    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      :loop="true"
      @loadedmetadata="onLoadedMeta"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @error="onError"
      @waiting="isLoading = true"
      @canplay="isLoading = false"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    />
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  autoPlay: { type: Boolean, default: false }
})

const audioRef = ref(null)
const isPlaying = ref(false)
const isLoading = ref(false)

function togglePlay() {
  if (!audioRef.value || isLoading.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play().catch(() => {})
  }
}

function onLoadedMeta() {
  isLoading.value = false
  if (props.autoPlay) {
    audioRef.value?.play().catch(() => {})
  }
}

function onTimeUpdate() {}

function onEnded() {
  isPlaying.value = false
}

function onError() {
  isPlaying.value = false
  isLoading.value = false
}

watch(
  () => props.src,
  () => {
    isPlaying.value = false
    isLoading.value = true
  }
)

onUnmounted(() => {
  if (audioRef.value) audioRef.value.pause()
})
</script>

<style scoped>
.cover-music {
  position: absolute;
  left: 12px;
  bottom: -14px;
  z-index: 3;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.music-disc {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  position: relative;
}

.cover-music:active .music-disc {
  transform: scale(0.88);
}

.music-disc.spinning {
  animation: disc-spin 5s linear infinite;
}

.music-disc.playing {
  box-shadow:
    0 2px 12px rgba(7, 193, 96, 0.35),
    inset 0 0 0 1px rgba(7, 193, 96, 0.3);
}

@keyframes disc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-grooves {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle,
    transparent 0,
    transparent 2px,
    rgba(255, 255, 255, 0.04) 2px,
    rgba(255, 255, 255, 0.04) 3px
  );
}

.disc-label {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-color), var(--theme-color-light));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.3);
  z-index: 1;
}
</style>
