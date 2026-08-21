<template>
  <div v-if="comments.length > 0" class="comment-list">
    <div
      v-for="comment in previewComments"
      :key="comment.id"
      class="comment-preview"
    >
      <div class="comment-preview-main" @click="$emit('reply', comment)">
        <span class="comment-nickname">{{ comment.user?.nickname || '未知用户' }}</span>
        <template v-if="comment.replyTo">
          <span class="comment-reply">回复</span>
          <span class="comment-nickname">@{{ comment.replyTo.nickname }}</span>
        </template>
        <span class="comment-content">: {{ comment.content }}</span>
      </div>
      <van-icon
        v-if="comment.userId && comment.userId === currentUserId"
        name="cross"
        class="comment-delete"
        @click.stop="$emit('delete', comment)"
      />
    </div>
    <div
      v-if="comments.length > maxPreview"
      class="comment-more"
      @click="$emit('view-all')"
    >
      查看全部 {{ comments.length }} 条评论
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  comments: { type: Array, default: () => [] },
  maxPreview: { type: Number, default: 3 },
  currentUserId: { type: Number, default: 0 }
})

defineEmits(['view-all', 'reply', 'delete'])

const previewComments = computed(() => props.comments.slice(0, props.maxPreview))
</script>

<style scoped>
.comment-list {
  margin-top: 8px;
  padding: 0 16px;
}

.comment-preview {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  padding: 2px 0;
}

.comment-preview-main {
  flex: 1;
  cursor: pointer;
}

.comment-preview-main:active {
  opacity: 0.6;
}

.comment-delete {
  color: #c8c9cc;
  font-size: 12px;
  padding: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.comment-delete:active {
  color: #ee0a24;
}

.comment-nickname {
  color: #576b95;
  font-weight: 500;
}

.comment-reply {
  color: #999;
  margin: 0 2px;
}

.comment-content {
  color: #333;
}

.comment-more {
  color: #576b95;
  font-size: 14px;
  padding: 4px 0;
  cursor: pointer;
}
</style>
