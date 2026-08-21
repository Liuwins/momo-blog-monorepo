<template>
  <van-nav-bar
    :title="title"
    :left-text="leftText"
    :left-arrow="showBack"
    :right-text="rightText"
    :right-icon="rightIcon"
    @click-left="handleLeft"
    @click-right="handleRight"
  >
    <template #right>
      <slot name="right" />
    </template>
  </van-nav-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: 'MomoBlog' },
  leftText: { type: String, default: '' },
  rightText: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  rightIcon: { type: String, default: '' }
})

const emit = defineEmits(['click-right', 'click-left'])
const router = useRouter()

function handleLeft() {
  if (props.showBack) {
    router.back()
  }
  emit('click-left')
}

function handleRight() {
  emit('click-right')
}
</script>