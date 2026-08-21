<template>
  <div class="favorites-page">
    <app-nav-bar title="收藏与历史" show-back />

    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="收藏">
        <div class="tab-body">
          <div v-if="favorites.length === 0" class="empty">
            <van-empty description="还没有收藏内容" />
          </div>
          <div v-for="item in favorites" :key="item.id" class="fav-item" @click="goDetail(item.id)">
            <van-image
              v-if="item.cover"
              round
              width="56"
              height="56"
              :src="coverThumb(item.cover)"
              class="cover"
              fit="cover"
            >
              <template #error>
                <div class="cover-error-slot">
                  <van-icon name="photo-fail" size="24" color="#c8c9cc" />
                </div>
              </template>
            </van-image>
            <div v-else class="cover placeholder">
              <van-icon name="description" size="24" color="#c8c9cc" />
            </div>
            <div class="info">
              <div class="content-text">{{ item.content || '（无文字内容）' }}</div>
              <div class="meta">
                <span class="nickname">{{ item.nickname }}</span>
                <span class="time">收藏于 {{ formatRelativeTime(item.savedAt) }}</span>
              </div>
            </div>
            <van-icon
              name="cross"
              size="16"
              color="#999"
              class="remove-btn"
              @click.stop="handleRemoveFav(item.id)"
            />
          </div>
        </div>
      </van-tab>

      <van-tab title="浏览历史">
        <div class="tab-body">
          <div v-if="history.length === 0" class="empty">
            <van-empty description="还没有浏览记录" />
          </div>
          <div v-else class="clear-bar">
            <van-button size="small" plain type="danger" @click="handleClearHistory"
              >清空历史</van-button
            >
          </div>
          <div v-for="item in history" :key="item.id" class="fav-item" @click="goDetail(item.id)">
            <van-image
              v-if="item.cover"
              round
              width="56"
              height="56"
              :src="coverThumb(item.cover)"
              class="cover"
              fit="cover"
            >
              <template #error>
                <div class="cover-error-slot">
                  <van-icon name="photo-fail" size="24" color="#c8c9cc" />
                </div>
              </template>
            </van-image>
            <div v-else class="cover placeholder">
              <van-icon name="description" size="24" color="#c8c9cc" />
            </div>
            <div class="info">
              <div class="content-text">{{ item.content || '（无文字内容）' }}</div>
              <div class="meta">
                <span class="nickname">{{ item.nickname }}</span>
                <span class="time">浏览于 {{ formatRelativeTime(item.viewedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { toast } from '@/utils/toast'
import { getFavorites, removeFavorite, getHistory, clearHistory } from '@/utils/storage'
import { formatRelativeTime } from '@/utils/time'

const router = useRouter()
const activeTab = ref(0)
const favorites = ref([])
const history = ref([])

onMounted(() => {
  favorites.value = getFavorites()
  history.value = getHistory()
})

// 缩略图转换：orig.webp -> thumb.webp（与 ImageGrid 一致）
function coverThumb(url) {
  if (!url) return ''
  const m = url.match(/^(\/images\/[^/]+\/)orig\.(webp|gif)$/)
  return m ? `${m[1]}thumb.${m[2] === 'gif' ? 'gif' : 'webp'}` : url
}

function goDetail(id) {
  router.push(`/post/${id}`)
}

function handleRemoveFav(id) {
  removeFavorite(id)
  favorites.value = getFavorites()
  toast.info('已移除')
}

async function handleClearHistory() {
  try {
    await showConfirmDialog({ title: '提示', message: '确定清空所有浏览历史吗？' })
    clearHistory()
    history.value = []
    toast.info('已清空')
  } catch {
    /* 取消 */
  }
}
</script>

<style scoped>
.favorites-page {
  min-height: 100dvh;
  background: var(--bg-card);
}

.tab-body {
  min-height: 200px;
}

.empty {
  padding: 40px 0;
}

.clear-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px;
}

.fav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
}

.fav-item:active {
  background: var(--bg-hover);
}

.cover {
  flex-shrink: 0;
}

.cover.placeholder {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  border-radius: 6px;
}

.cover-error-slot {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover, #f7f8fa);
}

.info {
  flex: 1;
  min-width: 0;
}

.content-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-light);
}

.nickname {
  color: var(--text-link);
}

.remove-btn {
  flex-shrink: 0;
  padding: 8px;
  cursor: pointer;
}
</style>
