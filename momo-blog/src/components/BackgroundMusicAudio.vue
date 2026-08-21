<template>
  <!-- 全局唯一音频节点：页面路由切换时不会被销毁。 -->
  <audio
    ref="audioRef"
    class="background-audio"
    preload="metadata"
    :loop="musicStore.loop"
    aria-hidden="true"
    @loadedmetadata="musicStore.onLoadedMetadata"
    @timeupdate="musicStore.onTimeUpdate"
    @progress="musicStore.onProgress"
    @ended="musicStore.onEnded"
    @error="musicStore.onError"
    @waiting="musicStore.onWaiting"
    @canplay="musicStore.onCanPlay"
    @play="musicStore.onPlay"
    @pause="musicStore.onPause"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useBackgroundMusicStore } from '@/stores/music'

const musicStore = useBackgroundMusicStore()
const audioRef = ref(null)

onMounted(() => {
  musicStore.attachAudio(audioRef.value)
})

onUnmounted(() => {
  musicStore.detachAudio(audioRef.value)
})
</script>

<style scoped>
.background-audio {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
