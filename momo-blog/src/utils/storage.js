// 本地存储统一管理：收藏 / 浏览历史 / 草稿箱
// 纯 localStorage，零后端依赖

const FAV_KEY = 'momo_favorites'
const HISTORY_KEY = 'momo_history'
const DRAFT_KEY = 'momo_draft'

function read(key, def = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || def
  } catch {
    return def
  }
}

function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* localStorage 满或不可用时静默失败 */
  }
}

// ============ 收藏 ============

export function getFavorites() {
  return read(FAV_KEY, [])
}

export function isFavorited(id) {
  return getFavorites().some((p) => p.id === id)
}

// 返回 true=已收藏 false=已取消
export function toggleFavorite(post) {
  const list = getFavorites()
  const idx = list.findIndex((p) => p.id === post.id)
  if (idx !== -1) {
    list.splice(idx, 1)
    write(FAV_KEY, list)
    return false
  }
  // 只存摘要，避免占用过大
  list.unshift({
    id: post.id,
    content: (post.content || '').slice(0, 100),
    cover: (post.images || [])[0] || (post.videos || [])[0] || '',
    nickname: post.user?.nickname || '匿名',
    avatar: post.user?.avatar || '',
    createdAt: post.createdAt,
    savedAt: Date.now()
  })
  if (list.length > 200) list.length = 200
  write(FAV_KEY, list)
  return true
}

export function removeFavorite(id) {
  const list = getFavorites().filter((p) => p.id !== id)
  write(FAV_KEY, list)
}

// ============ 浏览历史 ============

export function getHistory() {
  return read(HISTORY_KEY, [])
}

export function addHistory(post) {
  if (!post || !post.id) return
  let list = read(HISTORY_KEY, [])
  list = list.filter((p) => p.id !== post.id)
  list.unshift({
    id: post.id,
    content: (post.content || '').slice(0, 100),
    cover: (post.images || [])[0] || (post.videos || [])[0] || '',
    nickname: post.user?.nickname || '匿名',
    avatar: post.user?.avatar || '',
    createdAt: post.createdAt,
    viewedAt: Date.now()
  })
  if (list.length > 100) list.length = 100
  write(HISTORY_KEY, list)
}

export function clearHistory() {
  write(HISTORY_KEY, [])
}

// ============ 草稿箱 ============

export function getDraft() {
  return read(DRAFT_KEY, null)
}

export function saveDraft(draft) {
  write(DRAFT_KEY, { ...draft, savedAt: Date.now() })
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}
