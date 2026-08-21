<template>
  <div class="post-card">
    <div class="post-header">
      <van-image
        round
        width="40"
        height="40"
        :src="avatarSrc"
        class="avatar"
        lazy-load
        @click="goProfile"
        @error="onAvatarError"
      />
      <div class="header-info">
        <div class="nickname" @click="goProfile">{{ post.user?.nickname || '匿名' }}</div>
        <div class="time">{{ formatRelativeTime(post.createdAt) }}</div>
      </div>
      <!-- 自己的文章：更多菜单 -->
      <van-icon
        v-if="isOwner"
        name="ellipsis"
        size="20"
        color="#999"
        class="more-btn"
        @click="showMenu = true"
      />
    </div>

    <div v-if="post.content" class="post-content">
      <div ref="contentRef" class="content-text" :class="{ collapsed: contentCollapsed }">
        <MarkdownView v-if="isMarkdown" :content="post.content" />
        <template v-else>{{ post.content }}</template>
      </div>
      <div v-if="showFullBtn" class="full-btn" @click="contentCollapsed = !contentCollapsed">
        {{ contentCollapsed ? '全文' : '收起' }}
      </div>
    </div>

    <ImageGrid :images="post.images" class="post-images" />

    <VideoGrid v-if="post.videos && post.videos.length" :videos="post.videos" class="post-images" />

    <!-- 标签展示 -->
    <div v-if="post.tags && post.tags.length" class="post-tags">
      <span v-for="tag in post.tags" :key="tag" class="tag-chip" @click="emit('tag-click', tag)">
        #{{ tag }}
      </span>
    </div>

    <!-- 文章配乐 -->
    <MusicPlayer v-if="post.music" :src="post.music" class="post-music" />

    <div class="post-actions">
      <LikeButton
        :post-id="post.id"
        :liked="post.liked"
        :count="post.likeCount"
        @update:liked="emit('update:liked', $event)"
        @update:count="emit('update:count', $event)"
      />
      <div class="action-item" @click="handleComment">
        <van-icon name="chat-o" size="20" color="#333" />
        <span class="action-text">{{ post.commentCount > 0 ? post.commentCount : '评论' }}</span>
      </div>
    </div>

    <div v-if="post.likeUsers && post.likeUsers.length > 0" class="like-users">
      <van-icon name="like" color="#ee0a24" size="12" />
      <span class="like-users-text">
        {{
          post.likeUsers
            .slice(0, 3)
            .map((u) => u.nickname)
            .join('、')
        }}
        <template v-if="post.likeUsers.length > 3">
          等 {{ post.likeUsers.length }} 人赞了
        </template>
        <template v-else> 赞了 </template>
      </span>
    </div>

    <!-- 评论预览 -->
    <div v-if="post.comments && post.comments.length" class="comment-preview">
      <div
        v-for="comment in post.comments.slice(0, 3)"
        :key="comment.id"
        class="comment-preview-item"
        @click="handleComment"
      >
        <span class="comment-preview-nickname">{{ comment.nickname || '匿名' }}</span>
        <span v-if="comment.status === 'pending'" class="audit-tag">审核中</span>
        <span
          class="comment-preview-content"
          :class="{ 'audit-blur': comment.status === 'pending' }"
          >: {{ comment.content }}</span
        >
      </div>
      <div v-if="post.comments.length > 3" class="comment-more" @click="handleComment">
        查看全部 {{ post.comments.length }} 条评论
      </div>
    </div>

    <!-- 操作菜单（朋友圈风格） -->
    <van-action-sheet
      v-model:show="showMenu"
      :actions="actions"
      cancel-text="取消"
      close-on-click-action
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { toast } from '@/utils/toast'
import { formatRelativeTime } from '@/utils/time'
import { deletePost } from '@/api/post'
import MarkdownView from '@/components/MarkdownView.vue'
import LikeButton from '@/components/LikeButton.vue'
import ImageGrid from '@/components/ImageGrid.vue'
import VideoGrid from '@/components/VideoGrid.vue'
import MusicPlayer from '@/components/MusicPlayer.vue'

const props = defineProps({
  post: { type: Object, required: true },
  currentUserId: { type: Number, default: 0 }
})

const emit = defineEmits(['comment', 'update:liked', 'update:count', 'deleted', 'tag-click'])
const router = useRouter()
const contentCollapsed = ref(true)
const showFullBtn = ref(false)
const contentRef = ref(null)
const showMenu = ref(false)
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor'

const isOwner = computed(() => props.currentUserId && props.post.userId === props.currentUserId)

// 头像加载失败兜底：error 时切换为默认头像
const avatarError = ref(false)
const avatarSrc = computed(() => {
  if (avatarError.value) return defaultAvatar
  return props.post.user?.avatar || defaultAvatar
})
function onAvatarError() {
  avatarError.value = true
}

// 判断是否包含 markdown 语法（避免普通文本误渲染）
const MD_PATTERN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|^#{1,4}\s|^>\s|^[-*+]\s|^```|\[[^\]]+\]\([^)]+\)|!\[[^\]]*\]\([^)]+\))/m
const isMarkdown = computed(() => {
  const c = props.post.content || ''
  return MD_PATTERN.test(c) && c.length < 5000
})

const actions = computed(() => {
  const list = [{ name: '编辑', key: 'edit' }]
  list.push({ name: '删除', key: 'delete', color: '#ee0a24' })
  return list
})

onMounted(async () => {
  await nextTick()
  if (contentRef.value) {
    showFullBtn.value = contentRef.value.scrollHeight > contentRef.value.clientHeight
  }
})

function goProfile() {
  router.push(`/profile/${props.post.userId}`)
}

function handleComment() {
  emit('comment', props.post)
}

async function handleMenuSelect(action) {
  if (action.key === 'edit') {
    router.push({ path: '/publish', query: { edit: props.post.id } })
  } else if (action.key === 'delete') {
    try {
      await showConfirmDialog({
        title: '确定删除这条动态吗？',
        message: '删除后不可恢复'
      })
      await deletePost(props.post.id)
      toast.success('已删除')
      emit('deleted', props.post.id)
    } catch (e) {
      if (e !== 'cancel') {
        toast.fail('删除失败')
      }
    }
  }
}
</script>

<style scoped>
.post-card {
  background: var(--bg-card);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.post-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.avatar {
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  cursor: pointer;
}

.time {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.more-btn {
  flex-shrink: 0;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.more-btn:active {
  background: var(--bg-page);
}

.post-content {
  margin-bottom: 10px;
}

.content-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

.content-text.collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.full-btn {
  color: var(--text-link);
  font-size: 14px;
  margin-top: 4px;
  cursor: pointer;
}

.post-images {
  margin-bottom: 10px;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag-chip {
  display: inline-block;
  font-size: 13px;
  color: var(--text-link);
  background: var(--bg-tag);
  padding: 2px 10px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
}

.tag-chip:active {
  background: #dfe7f5;
}

.post-music {
  margin-bottom: 8px;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  user-select: none;
}

.action-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.action-text.active {
  color: #ffb300;
}

.like-users {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.like-users .van-icon {
  flex-shrink: 0;
}

.like-users-text {
  flex: 1;
  color: var(--text-link);
}

.comment-preview {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--bg-page);
  border-radius: 6px;
}

.comment-preview-item {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  cursor: pointer;
}

.comment-preview-item:active {
  opacity: 0.6;
}

.comment-preview-nickname {
  color: var(--text-link);
  font-weight: 500;
}

.comment-preview-content {
  color: var(--text-primary);
}

.audit-tag {
  font-size: 10px;
  color: #ff9800;
  background: #fff3e0;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 4px;
}

.comment-more {
  color: var(--text-link);
  font-size: 13px;
  margin-top: 6px;
  cursor: pointer;
}
</style>
