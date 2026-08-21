<template>
  <transition name="backtop-fade">
    <div v-show="visible" class="back-to-top" @click="scrollToTop">
      <van-icon name="back-top" size="22" color="#07c160" />
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  // 滚动超过该阈值（px）时显示按钮
  threshold: { type: Number, default: 400 },
  // 监听的目标元素选择器，默认监听 window
  target: { type: String, default: '' }
})

const visible = ref(false)
let scrollTarget = null

function handleScroll() {
  const scrollTop = scrollTarget
    ? scrollTarget.scrollTop
    : window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
  visible.value = scrollTop > props.threshold
}

function scrollToTop() {
  if (scrollTarget) {
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

onMounted(() => {
  // 优先使用传入的目标元素，否则监听 window
  scrollTarget = props.target ? document.querySelector(props.target) : null
  const listenerTarget = scrollTarget || window
  listenerTarget.addEventListener('scroll', handleScroll, { passive: true })
  // 初始化检查
  handleScroll()
})

onUnmounted(() => {
  const listenerTarget = scrollTarget || window
  listenerTarget.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: 16px;
  bottom: 80px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: transform 0.2s;
}

.back-to-top:active {
  transform: scale(0.9);
}

.backtop-fade-enter-active,
.backtop-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.backtop-fade-enter-from,
.backtop-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
