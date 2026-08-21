<template>
  <div class="post-detail-page">
    <app-nav-bar title="动态详情" show-back />

    <div v-if="post" class="detail-body">
      <PostCard
        :post="post"
        :current-user-id="currentUserId"
        @comment="handleComment"
        @update:liked="post.liked = $event"
        @update:count="post.likeCount = $event"
        @deleted="handleDeleted"
      />

      <div class="detail-comments">
        <div class="detail-comments-header">全部评论 ({{ comments.length }})</div>
        <div v-if="comments.length === 0" class="detail-comments-empty">暂无评论</div>
        <div v-for="comment in comments" :key="comment.id" class="detail-comment-item">
          <van-image round width="32" height="32" :src="comment.avatar || defaultAvatar">
            <template #error>
              <img class="comment-avatar-fallback" :src="defaultAvatar" alt="头像" />
            </template>
          </van-image>
          <div class="detail-comment-content">
            <div class="detail-comment-nickname">
              {{ comment.nickname || '匿名' }}
              <span v-if="comment.status === 'pending'" class="audit-tag">审核中</span>
            </div>
            <!-- 审核中：博主正常看内容（灰色斜体+审核中标签），游客显示占位文本 -->
            <div
              class="detail-comment-text"
              :class="{
                'masked-text': comment.masked,
                pending: comment.status === 'pending' && userStore.isLoggedIn
              }"
            >
              <template v-if="comment.replyTo">
                <span class="reply-tag">回复</span>
                <span class="reply-nickname">@{{ comment.replyTo.nickname }}</span>
              </template>
              {{ comment.content }}
            </div>
            <div class="detail-comment-time">{{ formatRelativeTime(comment.createdAt) }}</div>
            <!-- 评论操作 -->
            <div class="comment-item-actions">
              <span class="action-btn reply" @click="handleReply(comment)">回复</span>
              <span
                v-if="canDeleteComment(comment)"
                class="action-btn delete"
                @click="handleDeleteComment(comment)"
                >删除</span
              >
            </div>
            <!-- 博主操作 -->
            <div
              v-if="userStore.isLoggedIn && comment.status === 'pending'"
              class="comment-actions"
            >
              <span class="action-btn approve" @click="handleApproveComment(comment)">通过</span>
              <span class="action-btn reject" @click="handleRejectComment(comment)">拒绝</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="detail-loading">
      <van-loading />
    </div>

    <!-- 返回顶部 -->
    <BackToTop />

    <div class="detail-input-bar">
      <div v-if="replyTo" class="reply-indicator">
        <span>回复 @{{ replyTo.nickname }}</span>
        <van-icon name="cross" @click="clearReply" />
      </div>
      <!-- 未登录时输入昵称 -->
      <div v-if="!userStore.isLoggedIn" class="nickname-input">
        <van-field v-model="commentNickname" placeholder="输入你的昵称" maxlength="20" />
      </div>
      <van-field
        v-model="commentText"
        :placeholder="replyTo ? `回复 @${replyTo.nickname}` : '写评论...'"
        @keypress.enter="submitComment"
      >
        <template #button>
          <van-button
            size="small"
            type="primary"
            :disabled="
              !commentText.trim() ||
              submitting ||
              (!userStore.isLoggedIn && !commentNickname.trim())
            "
            :loading="submitting"
            @click="submitComment"
          >
            发送
          </van-button>
        </template>
      </van-field>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import {
  getPostDetail,
  getComments,
  createComment,
  deleteComment,
  approveComment,
  rejectComment
} from '@/api/post'
import { getVisitorId, getVisitorNickname, setVisitorNickname } from '@/utils/visitor'
import { addHistory } from '@/utils/storage'
import { formatRelativeTime } from '@/utils/time'
import BackToTop from '@/components/BackToTop.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const post = ref(null)
const comments = ref([])
const commentText = ref('')
const commentNickname = ref('')
const replyTo = ref(null)
const submitting = ref(false)
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor'

const currentUserId = computed(() => userStore.userInfo?.id || 0)

onMounted(async () => {
  try {
    const res = await getPostDetail(route.params.id)
    post.value = res
    // 记录浏览历史（本地存储）
    addHistory(res)
    // 加载评论列表
    await loadComments()
    // 初始化游客昵称
    commentNickname.value = getVisitorNickname()
  } catch (e) {
    toast.fail('加载失败')
  }
})

async function loadComments() {
  try {
    const list = await getComments(route.params.id)
    comments.value = list
  } catch (e) {
    comments.value = []
  }
}

function handleComment(_post) {
  // 滚动到评论区域
  document.querySelector('.detail-comments')?.scrollIntoView({ behavior: 'smooth' })
}

function handleReply(comment) {
  replyTo.value = { id: comment.id, nickname: comment.nickname || comment.user?.nickname || '匿名' }
}

function canDeleteComment(comment) {
  // 博主（已登录）可删除任意评论；评论作者可删除自己的评论
  if (userStore.isLoggedIn) return true
  return comment.userId && comment.userId === currentUserId.value
}

function clearReply() {
  replyTo.value = null
}

async function submitComment() {
  if (!commentText.value.trim()) return
  if (submitting.value) return
  if (!userStore.isLoggedIn && !commentNickname.value.trim()) {
    toast.fail('请输入昵称')
    return
  }
  submitting.value = true
  try {
    const payload = {
      postId: route.params.id,
      content: commentText.value
    }
    // 回复某条评论
    if (replyTo.value) {
      payload.replyToId = replyTo.value.id
      payload.replyToNickname = replyTo.value.nickname
    }
    // 未登录时带上昵称和 visitorId
    if (!userStore.isLoggedIn) {
      payload.nickname = commentNickname.value.trim()
      payload.visitorId = getVisitorId()
      setVisitorNickname(commentNickname.value.trim())
    }
    const res = await createComment(payload)
    comments.value.push(res)
    if (post.value) {
      post.value.commentCount = comments.value.length
    }
    commentText.value = ''
    replyTo.value = null
    toast.success('评论成功，等待审核')
  } catch (e) {
    toast.fail('评论失败')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteComment(comment) {
  try {
    await showConfirmDialog({ title: '提示', message: '确定删除这条评论吗？' })
  } catch {
    return
  }
  try {
    const ok = await deleteComment(comment.id)
    if (ok === false) {
      toast.fail('无权删除')
      return
    }
    const idx = comments.value.findIndex((c) => c.id === comment.id)
    if (idx !== -1) comments.value.splice(idx, 1)
    if (post.value) post.value.commentCount = comments.value.length
    toast.success('已删除')
  } catch (e) {
    toast.fail('删除失败')
  }
}

async function handleApproveComment(comment) {
  try {
    await approveComment(comment.id)
    comment.status = 'approved'
    toast.success('已通过')
  } catch (e) {
    toast.fail('操作失败')
  }
}

async function handleRejectComment(comment) {
  try {
    await rejectComment(comment.id)
    comment.status = 'rejected'
    toast.success('已拒绝')
  } catch (e) {
    toast.fail('操作失败')
  }
}

function handleDeleted() {
  toast.success('已删除')
  router.back()
}
</script>

<style scoped>
.post-detail-page {
  min-height: 100dvh;
  background: var(--bg-card);
  padding-bottom: 60px;
}

.detail-body {
  padding-bottom: 60px;
}

.detail-comments {
  padding: 16px;
}

.detail-comments-header {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.detail-comments-empty {
  text-align: center;
  color: var(--text-light);
  padding: 40px 0;
}

.detail-comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.comment-avatar-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-comment-content {
  flex: 1;
  min-width: 0;
}

.detail-comment-nickname {
  font-size: 13px;
  color: var(--text-link);
  font-weight: 500;
}

.audit-tag {
  font-size: 10px;
  color: #ff9800;
  background: #fff3e0;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
}

.detail-comment-text.masked-text {
  color: var(--text-light);
  font-style: italic;
  background: var(--bg-page);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.detail-comment-text.pending {
  color: var(--text-light);
  font-style: italic;
}

.detail-comment-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-top: 2px;
  line-height: 1.4;
}

.detail-comment-time {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.comment-actions {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}

.action-btn {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn.approve {
  color: var(--theme-color);
  background: #e8f5e9;
}

.action-btn.reject {
  color: #ee0a24;
  background: #ffebee;
}

.comment-item-actions {
  margin-top: 4px;
  display: flex;
  gap: 12px;
}

.comment-item-actions .action-btn {
  color: var(--text-link);
  background: transparent;
  padding: 2px 0;
}

.comment-item-actions .action-btn.delete {
  color: var(--text-light);
}

.reply-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f2f5;
  color: var(--text-link);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.reply-tag {
  color: var(--text-light);
}

.reply-nickname {
  color: var(--text-link);
}

.detail-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.detail-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: var(--max-width);
  margin: 0 auto;
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
}

.nickname-input {
  margin-bottom: 8px;
}

.nickname-input :deep(.van-field) {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 4px 8px;
}
</style>
