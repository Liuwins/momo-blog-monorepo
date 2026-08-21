<template>
  <div class="like-button" @click="handleClick">
    <div class="like-icon-wrap">
      <van-icon
        :name="liked ? 'like' : 'like-o'"
        :color="liked ? '#ee0a24' : '#333'"
        size="20"
        :class="{ 'like-animate': animating }"
      />
      <!-- 心形粒子飞出动画 -->
      <span v-for="p in particles" :key="p.id" class="heart-particle" :style="p.style">❤</span>
    </div>
    <span class="like-text" :class="{ active: liked }">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { toast } from '@/utils/toast'
import { toggleLike } from '@/api/post'
import { getVisitorId } from '@/utils/visitor'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  postId: { type: Number, required: true },
  liked: { type: Boolean, default: false },
  count: { type: Number, default: 0 }
})

const emit = defineEmits(['update:liked', 'update:count'])

const userStore = useUserStore()
const label = computed(() => (props.count > 0 ? `${props.count}` : '赞'))
const animating = ref(false)
const pending = ref(false)
// 心形粒子集合
const particles = ref([])
let particleId = 0

// 触发心形粒子飞出动画
function spawnHearts() {
  const count = 6
  const newOnes = []
  for (let i = 0; i < count; i++) {
    const id = ++particleId
    // 随机角度（-90度上下，扩散到左右两侧）
    const angle = -90 + (Math.random() * 120 - 60)
    const distance = 28 + Math.random() * 16
    const dx = Math.cos((angle * Math.PI) / 180) * distance
    const dy = Math.sin((angle * Math.PI) / 180) * distance
    const scale = 0.6 + Math.random() * 0.6
    const rotate = Math.random() * 60 - 30
    newOnes.push({
      id,
      style: {
        '--dx': `${dx}px`,
        '--dy': `${dy}px`,
        '--scale': scale,
        '--rotate': `${rotate}deg`,
        animationDelay: `${i * 30}ms`
      }
    })
  }
  particles.value.push(...newOnes)
  // 动画结束后清理
  setTimeout(() => {
    particles.value = particles.value.filter((p) => !newOnes.find((n) => n.id === p.id))
  }, 900)
}

async function handleClick() {
  // 防抖：请求进行中不重复触发
  if (pending.value) return
  pending.value = true

  // 乐观更新：先更新 UI 再发请求，网络慢时也有即时反馈
  const prevLiked = props.liked
  const optimisticLiked = !prevLiked
  const optimisticCount = Math.max(0, props.count + (optimisticLiked ? 1 : -1))
  emit('update:liked', optimisticLiked)
  emit('update:count', optimisticCount)

  if (optimisticLiked) {
    animating.value = true
    setTimeout(() => {
      animating.value = false
    }, 400)
    spawnHearts()
  }

  try {
    const visitorId = userStore.isLoggedIn ? null : getVisitorId()
    const res = await toggleLike(props.postId, visitorId)
    // 用后端返回的真实状态校正
    if (!res.liked && !prevLiked) {
      // 未生效（如未登录无 visitorId 的兜底），回滚
      emit('update:liked', prevLiked)
      emit('update:count', props.count)
      toast.fail('操作失败')
      return
    }
    emit('update:liked', res.liked)
    emit('update:count', res.likeCount ?? optimisticCount)
  } catch (e) {
    // 请求失败：回滚到原状态
    emit('update:liked', prevLiked)
    emit('update:count', props.count)
    toast.fail('操作失败')
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.like-button {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  user-select: none;
}

.like-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.like-text {
  font-size: 13px;
  color: #666;
}

.like-text.active {
  color: #ee0a24;
}

.like-animate {
  animation: like-bounce 0.4s ease;
}

@keyframes like-bounce {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.35);
  }
  60% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

/* 心形粒子飞出动画 */
.heart-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 14px;
  color: #ee0a24;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  animation: heart-fly 0.8s ease-out forwards;
}

@keyframes heart-fly {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(0deg);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(var(--scale))
      rotate(var(--rotate));
    opacity: 0;
  }
}
</style>
