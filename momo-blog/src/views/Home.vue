<template>
  <div class="home-page">
    <app-nav-bar title="MomoBlog">
      <template #right>
        <van-icon v-if="userStore.isLoggedIn" name="plus" size="20" class="nav-icon" @click="goPublish" />
      </template>
    </app-nav-bar>

    <!-- 朋友圈风格封面：头像重叠在右下角，点击封面可更换 -->
    <div
      class="moments-cover"
      :class="{ 'is-owner': userStore.isLoggedIn }"
      :style="coverStyle"
      @click="handleCoverClick"
    >
      <!-- 封面操作提示仅管理员可见，访客无封面编辑权限，不展示入口 -->
      <div v-if="userStore.isLoggedIn" class="cover-hint">
        <van-icon name="photograph" size="13" />
        <span>更换封面</span>
      </div>
      <div class="cover-user">
        <span class="cover-nickname">{{ coverNickname }}</span>
        <van-image
          class="cover-avatar"
          width="64"
          height="64"
          fit="cover"
          :src="coverAvatar"
          @click.stop="goProfile"
        >
          <template #error>
            <img class="cover-avatar-fallback" :src="defaultAvatar" alt="头像" />
          </template>
        </van-image>
      </div>

      <!-- 封面内嵌音乐控制：不占额外空间 -->
      <CoverMusic
        v-if="bgMusicSrc"
        :src="bgMusicSrc"
        :auto-play="bgMusicAutoPlay"
      />
    </div>

    <div class="home-toolbar">
      <!-- 天气 + 动态流切换：同一行展示 -->
      <div class="toolbar-top">
        <WeatherWidget />
        <DailyQuote />
        <div v-if="userStore.isLoggedIn" class="feed-tabs">
          <span class="feed-tab" :class="{ active: feedType === 'all' }" @click="switchFeed('all')"
            >全部</span
          >
          <span
            class="feed-tab"
            :class="{ active: feedType === 'following' }"
            @click="switchFeed('following')"
            >关注</span
          >
        </div>
      </div>
      <van-search
        v-model="keyword"
        placeholder="搜索内容"
        shape="round"
        class="home-search"
        @search="onSearch"
        @clear="onSearch"
      />
      <div class="sort-tabs">
        <span
          class="sort-tab"
          :class="{ active: sortBy === 'latest' }"
          @click="changeSort('latest')"
          >最新</span
        >
        <span class="sort-tab" :class="{ active: sortBy === 'hot' }" @click="changeSort('hot')"
          >最热</span
        >
      </div>
      <!-- 标签筛选（合并热门与全量，热门带排名编号在前） -->
      <div v-if="allTags.length" class="tag-filter">
        <span class="tag-filter-item" :class="{ active: !activeTag }" @click="filterByTag('')"
          >全部</span
        >
        <span
          v-for="tag in mergedTags"
          :key="tag.name"
          class="tag-filter-item"
          :class="{ active: activeTag === tag.name, hot: tag.hot }"
          @click="filterByTag(tag.name)"
        >
          <span v-if="tag.rank" class="hot-rank" :class="`rank-${tag.rank}`">{{ tag.rank }}</span>
          #{{ tag.name }}<sup v-if="tag.count > 1">{{ tag.count }}</sup>
        </span>
      </div>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        :error="error"
        finished-text="没有更多了"
        error-text="加载失败，点击重试"
        @load="onLoad"
      >
        <template v-if="list.length > 0">
          <PostCard
            v-for="item in list"
            :key="item.id"
            :post="item"
            :current-user-id="userStore.userInfo?.id || 0"
            @comment="handleComment"
            @update:liked="updatePostLike(item.id, 'liked', $event)"
            @update:count="updatePostLike(item.id, 'likeCount', $event)"
            @deleted="handleDeleted"
            @tag-click="handleTagClick"
          />
        </template>
        <template v-else-if="loading">
          <SkeletonCard v-for="i in 3" :key="i" />
        </template>
        <div v-else class="empty-state">
          <van-empty description="暂无动态" />
        </div>
      </van-list>
    </van-pull-refresh>

    <!-- 返回顶部 -->
    <BackToTop />

    <!-- 评论弹窗 -->
    <van-popup v-model:show="showCommentPopup" position="bottom" :style="{ height: '60dvh' }" round>
      <div class="comment-popup">
        <div class="comment-header">
          <span>评论 ({{ currentComments.length }})</span>
          <van-icon name="cross" @click="showCommentPopup = false" />
        </div>
        <div ref="commentBodyRef" class="comment-body">
          <div v-if="currentComments.length === 0" class="comment-empty">暂无评论</div>
          <div v-for="comment in currentComments" :key="comment.id" class="comment-item">
            <van-image round width="32" height="32" :src="comment.avatar || defaultAvatar">
              <template #error>
                <img class="comment-avatar-fallback" :src="defaultAvatar" alt="头像" />
              </template>
            </van-image>
            <div class="comment-item-content">
              <div class="comment-item-nickname">
                {{ comment.nickname || '匿名' }}
                <span v-if="comment.status === 'pending'" class="audit-tag">审核中</span>
              </div>
              <!-- 审核中：博主正常看内容（灰色斜体+审核中标签），游客显示占位文本 -->
              <div
                class="comment-item-text"
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
              <div class="comment-item-time">{{ formatRelativeTime(comment.createdAt) }}</div>
              <!-- 评论操作：回复 + 删除 -->
              <div class="comment-item-actions">
                <span class="action-btn reply" @click="handleReply(comment)">回复</span>
                <span
                  v-if="canDeleteComment(comment)"
                  class="action-btn delete"
                  @click="handleDeleteComment(comment)"
                  >删除</span
                >
              </div>
              <!-- 博主审核操作 -->
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
        <div class="comment-input-bar">
          <div v-if="replyTo" class="reply-tag">
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
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showConfirmDialog, showImagePreview } from 'vant'
import { toast } from '@/utils/toast'
import {
  getPosts,
  getTags,
  getComments,
  createComment,
  deleteComment,
  toggleLike,
  getLikeStatus,
  approveComment,
  rejectComment
} from '@/api/post'
import { getFollowingPosts, getMe, updateUserInfo, getOwnerProfile } from '@/api/user'
import { uploadImages } from '@/api/upload'
import { compressImage } from '@/utils/compress'
import { getVisitorId, getVisitorNickname, setVisitorNickname } from '@/utils/visitor'
import { formatRelativeTime } from '@/utils/time'
import WeatherWidget from '@/components/WeatherWidget.vue'
import DailyQuote from '@/components/DailyQuote.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import BackToTop from '@/components/BackToTop.vue'
import CoverMusic from '@/components/CoverMusic.vue'

const router = useRouter()
const userStore = useUserStore()

const refreshing = ref(false)
const loading = ref(false)
const finished = ref(false)
const error = ref(false)
const list = ref([])
const keyword = ref('')
const sortBy = ref('latest')
const allTags = ref([])
const hotTags = ref([])
const activeTag = ref('')
const page = ref(1)
const pageSize = 10
// 动态流类型：全部 / 关注
const feedType = ref('all')

// 合并热门与全量标签：热门标签在前（带排名编号），其余按原顺序跟随
const mergedTags = computed(() => {
  const hotMap = new Map(hotTags.value.map((t, idx) => [t.name, idx + 1]))
  return allTags.value.map((t) => ({
    name: t.name,
    count: t.count,
    hot: hotMap.has(t.name),
    rank: hotMap.get(t.name) || 0
  }))
})

const showCommentPopup = ref(false)
const commentText = ref('')
const commentNickname = ref('')
const currentPost = ref(null)
const currentComments = ref([])
const replyTo = ref(null)
const commentBodyRef = ref(null)
const submitting = ref(false)
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor'

// ===== 朋友圈风格封面 =====
// 访客未登录时，从后端获取博主公开资料（封面/头像/昵称），登录后优先用 userInfo
const ownerProfile = ref(null)

const coverStyle = computed(() => {
  const bg = userStore.userInfo?.bgImage || ownerProfile.value?.bgImage
  return bg
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.35)), url(${bg})` }
    : {}
})
const coverNickname = computed(() =>
  userStore.isLoggedIn
    ? userStore.userInfo?.nickname || '我'
    : ownerProfile.value?.nickname || '博主'
)
const coverAvatar = computed(() =>
  userStore.userInfo?.avatar || ownerProfile.value?.avatar || defaultAvatar
)
// 背景音乐：管理员用 userInfo，游客用 ownerProfile；游客自动播放
const bgMusicSrc = computed(() => userStore.userInfo?.bgMusic || ownerProfile.value?.bgMusic || '')
const bgMusicAutoPlay = computed(() => !userStore.isLoggedIn)

function goProfile() {
  if (userStore.isLoggedIn && userStore.userInfo?.id) {
    router.push('/profile/' + userStore.userInfo.id)
  } else {
    // 访客点击头像：查看大图，而非弹警告
    const img = coverAvatar.value
    if (img && !img.includes('dicebear')) {
      showImagePreview({ images: [img], closeable: true })
    }
  }
}

// 点击封面：管理员更换封面，访客无操作（不展示入口也不打扰）
async function handleCoverClick() {
  if (!userStore.isLoggedIn) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.fail('图片不能超过5MB')
      return
    }
    try {
      const compressed = await compressImage(file, 1280, 5 * 1024 * 1024)
      const res = await uploadImages([compressed])
      if (res.urls && res.urls.length > 0) {
        const bgImage = res.urls[0]
        await updateUserInfo({ bgImage })
        userStore.setUserInfo({ ...userStore.userInfo, bgImage })
        toast.success('封面已更新')
      } else {
        toast.fail('上传失败')
      }
    } catch (err) {
      toast.fail('上传失败')
    }
  }
  input.click()
}

// 搜索防抖
let searchTimer = null
function onSearch() {
  // 关注流下搜索，自动切回全部流
  feedType.value = 'all'
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    list.value = []
    page.value = 1
    finished.value = false
    error.value = false
    loading.value = false
    onLoad()
  }, 300)
}

async function onLoad() {
  loading.value = true
  try {
    let res
    if (feedType.value === 'following') {
      // 关注流：不支持搜索/标签筛选/排序
      res = await getFollowingPosts(page.value, pageSize)
    } else {
      const params = { page: page.value, pageSize: pageSize, sortBy: sortBy.value }
      if (keyword.value.trim()) params.keyword = keyword.value.trim()
      if (activeTag.value) params.tag = activeTag.value
      res = await getPosts(params)
    }
    if (res.list.length < pageSize) {
      finished.value = true
    }
    // 关注流返回的是 Post 实体，需适配 PostCard 的 user 嵌套结构
    const items = (res.list || []).map((p) =>
      p.user ? p : { ...p, user: { id: p.userId, nickname: p.nickname, avatar: p.avatar } }
    )
    list.value.push(...items)
    page.value++
  } catch (e) {
    error.value = true
    toast.fail('加载失败')
  } finally {
    loading.value = false
  }
}

// 切换动态流
function switchFeed(type) {
  if (feedType.value === type) return
  feedType.value = type
  list.value = []
  page.value = 1
  finished.value = false
  error.value = false
  loading.value = false
  onLoad()
}

// 加载标签列表（全量 + 本周热门 Top 6）
async function loadTags() {
  try {
    const [all, hot] = await Promise.all([getTags(), getTags('week')])
    allTags.value = all || []
    hotTags.value = (hot || []).slice(0, 6)
  } catch (e) {
    /* 忽略 */
  }
}

// 每次进入首页：重置状态，从头加载
onMounted(() => {
  list.value = []
  page.value = 1
  finished.value = false
  error.value = false
  loading.value = false
  loadTags()
  // 初始化游客昵称
  commentNickname.value = getVisitorNickname()
  // 静默刷新用户信息，保证封面/头像为最新
  if (userStore.isLoggedIn) {
    getMe()
      .then((me) => userStore.setUserInfo({ ...userStore.userInfo, ...me }))
      .catch(() => {})
  } else {
    // 访客未登录：获取博主公开资料，展示封面/头像/昵称
    getOwnerProfile()
      .then((data) => { if (data) ownerProfile.value = data })
      .catch(() => {})
  }
})

// 组件卸载时清理搜索定时器，防止内存泄漏
onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})

async function onRefresh() {
  list.value = []
  page.value = 1
  finished.value = false
  error.value = false
  loading.value = false
  refreshing.value = false
  await loadTags()
  await onLoad()
}

function changeSort(sort) {
  if (sortBy.value === sort) return
  feedType.value = 'all'
  sortBy.value = sort
  list.value = []
  page.value = 1
  finished.value = false
  error.value = false
  loading.value = false
  onLoad()
}

function filterByTag(tag) {
  feedType.value = 'all'
  activeTag.value = tag
  list.value = []
  page.value = 1
  finished.value = false
  error.value = false
  loading.value = false
  onLoad()
}

function handleTagClick(tag) {
  filterByTag(tag)
}

function goPublish() {
  if (userStore.isLoggedIn) {
    router.push('/publish')
  } else {
    router.push({ path: '/login', query: { redirect: '/publish' } })
  }
}

function handleDeleted(postId) {
  const idx = list.value.findIndex((p) => p.id === postId)
  if (idx !== -1) list.value.splice(idx, 1)
}

async function handleComment(post) {
  currentPost.value = post
  replyTo.value = null
  showCommentPopup.value = true
  // 加载评论列表（游客只返回已审核，博主返回所有）
  try {
    const comments = await getComments(post.id)
    currentComments.value = comments
  } catch (e) {
    currentComments.value = post.comments || []
  }
}

function handleReply(comment) {
  replyTo.value = { id: comment.id, nickname: comment.nickname || comment.user?.nickname || '匿名' }
}

function canDeleteComment(comment) {
  // 博主（已登录）可删除任意评论；评论作者可删除自己的评论
  if (userStore.isLoggedIn) return true
  return comment.userId && comment.userId === userStore.userInfo?.id
}

function clearReply() {
  replyTo.value = null
}

function updatePostLike(postId, field, value) {
  const post = list.value.find((p) => p.id === postId)
  if (post) post[field] = value
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
    // 同步当前评论弹窗列表
    const cIdx = currentComments.value.findIndex((c) => c.id === comment.id)
    if (cIdx !== -1) {
      currentComments.value.splice(cIdx, 1)
      if (currentPost.value) currentPost.value.commentCount = currentComments.value.length
    }
    // 同步 feed 列表中 post 的评论预览
    const post = list.value.find((p) => p.id === currentPost.value?.id)
    if (post && post.comments) {
      const idx = post.comments.findIndex((c) => c.id === comment.id)
      if (idx !== -1) {
        post.comments.splice(idx, 1)
        post.commentCount = (post.commentCount || 1) - 1
      }
    }
    toast.success('已删除')
  } catch (e) {
    toast.fail('删除失败')
  }
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
      postId: currentPost.value.id,
      content: commentText.value,
      replyToId: replyTo.value ? replyTo.value.id : undefined,
      replyToNickname: replyTo.value ? replyTo.value.nickname : undefined
    }
    // 未登录时带上昵称和 visitorId
    if (!userStore.isLoggedIn) {
      payload.nickname = commentNickname.value.trim()
      payload.visitorId = getVisitorId()
      setVisitorNickname(commentNickname.value.trim())
    }
    const res = await createComment(payload)
    currentComments.value.push(res)
    if (currentPost.value) {
      currentPost.value.commentCount = currentComments.value.length
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
</script>

<style scoped>
.home-page {
  min-height: 100dvh;
  background: var(--bg-card);
}

.empty-state {
  padding: 40px 0;
}

/* ===== 朋友圈风格封面 ===== */
.moments-cover {
  position: relative;
  height: 220px;
  /* 无封面时回退为主题色渐变 */
  background: linear-gradient(135deg, var(--theme-color) 0%, var(--theme-color-light) 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* 为右下角重叠的头像预留空间 */
  margin-bottom: 42px;
}

.moments-cover.is-owner {
  cursor: pointer;
}

.cover-hint {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 11px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.cover-user {
  position: absolute;
  right: 14px;
  bottom: -28px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.cover-nickname {
  padding-top: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.cover-avatar {
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: var(--bg-page);
  cursor: pointer;
}

.cover-avatar-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-toolbar {
  background: var(--bg-card);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}

/* 天气 + 一言 + 动态流切换同一行 */
.toolbar-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0 8px;
}

.toolbar-top :deep(.weather-widget) {
  flex-shrink: 0;
}

/* 动态流切换：分段胶囊样式 */
.feed-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 16px;
  background: var(--bg-page);
  flex-shrink: 0;
}

.feed-tab {
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 14px;
  border-radius: 13px;
  transition: color 0.2s, background 0.2s, box-shadow 0.2s;
  user-select: none;
}

.feed-tab.active {
  color: var(--theme-color);
  font-weight: 600;
  background: var(--bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.home-search {
  padding: 0 0 8px;
  background: transparent;
}

.home-search :deep(.van-search__content) {
  background: var(--bg-input);
}

/* 排序切换：胶囊按钮 */
.sort-tabs {
  display: flex;
  gap: 8px;
}

.sort-tab {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 14px;
  border-radius: 14px;
  background: var(--bg-page);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  user-select: none;
}

.sort-tab.active {
  color: var(--text-on-theme);
  font-weight: 500;
  background: var(--theme-color);
}

.tag-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tag-filter::-webkit-scrollbar {
  display: none;
}

.tag-filter-item {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--text-link);
  background: var(--bg-tag);
  padding: 4px 12px;
  border-radius: 14px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

/* 热门标签轻微高亮 */
.tag-filter-item.hot {
  background: #fff3e0;
  color: var(--rank-2);
}

.tag-filter-item.active {
  background: var(--text-link);
  color: var(--text-on-theme);
}

.tag-filter-item.active.hot {
  background: var(--rank-2);
  color: var(--text-on-theme);
}

.tag-filter-item sup {
  font-size: 10px;
  margin-left: 2px;
}

.hot-rank {
  font-size: 10px;
  font-weight: 700;
  width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  border-radius: 50%;
  color: var(--text-light);
  background: #e0e0e0;
}

.hot-rank.rank-1 {
  color: var(--text-on-theme);
  background: #ee0a24;
}

.hot-rank.rank-2 {
  color: var(--text-on-theme);
  background: var(--rank-2);
}

.hot-rank.rank-3 {
  color: var(--text-on-theme);
  background: #ffb300;
}

.nav-icon {
  padding: 0 6px;
  color: var(--text-primary);
}

.comment-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--border-light);
}

.comment-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.comment-empty {
  text-align: center;
  color: var(--text-light);
  padding: 40px 0;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.comment-avatar-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-item-content {
  flex: 1;
  min-width: 0;
}

.comment-item-nickname {
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

.comment-item-text.masked-text {
  color: var(--text-light);
  font-style: italic;
  background: var(--bg-page);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.comment-item-text.pending {
  color: var(--text-light);
  font-style: italic;
}

.comment-item-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-top: 2px;
  line-height: 1.4;
}

.reply-tag {
  color: var(--text-light);
}

.reply-nickname {
  color: var(--text-link);
}

.comment-item-time {
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

.reply-indicator .van-icon {
  cursor: pointer;
  color: var(--text-light);
}

.comment-input-bar {
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
