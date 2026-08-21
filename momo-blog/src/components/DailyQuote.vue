<template>
  <div v-if="quote" class="daily-quote" @click="refresh">
    <span class="quote-text">{{ quote.text }}</span>
    <span v-if="quote.from" class="quote-from">—— {{ quote.from }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const CACHE_KEY = 'momo_quote_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 分钟缓存
const MIN_REFRESH_INTERVAL = 10 * 1000 // 最小刷新间隔 10 秒
const MAX_TEXT_LENGTH = 40 // 超过此长度重新拉取
const MAX_FETCH_ATTEMPTS = 3 // 最多连续拉取次数（过滤超长句子）

const quote = ref(null)
const loading = ref(false)
let lastFetchTime = 0

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }))
  } catch {
    /* 忽略 */
  }
}

async function fetchQuote() {
  try {
    const res = await fetch('https://v1.hitokoto.cn/?c=d&c=h&c=i&encode=json')
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.hitokoto) return null
    return {
      text: data.hitokoto,
      from: data.from_who || data.from || ''
    }
  } catch {
    return null
  }
}

// 拉取一句话：超长时自动重试（最多 MAX_FETCH_ATTEMPTS 次）
async function fetchSuitableQuote() {
  for (let i = 0; i < MAX_FETCH_ATTEMPTS; i++) {
    const data = await fetchQuote()
    if (!data) return null
    if (data.text.length <= MAX_TEXT_LENGTH) return data
    // 超长，继续重试
  }
  // 重试耗尽，返回最后一次结果（兜底）
  return fetchQuote()
}

async function load() {
  if (loading.value) return
  loading.value = true
  lastFetchTime = Date.now()

  const cached = readCache()
  if (cached) {
    const { ts, ...rest } = cached
    quote.value = rest
    loading.value = false
    return
  }

  const data = await fetchSuitableQuote()
  if (data) {
    quote.value = data
    writeCache(data)
  }
  loading.value = false
}

function refresh() {
  // 节流：距离上次请求不足 10 秒则忽略
  if (Date.now() - lastFetchTime < MIN_REFRESH_INTERVAL) return
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* 忽略 */
  }
  quote.value = null
  load()
}

onMounted(load)
</script>

<style scoped>
.daily-quote {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-light);
  cursor: pointer;
  user-select: none;
  overflow: hidden;
}

.quote-text {
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.quote-from {
  flex-shrink: 0;
  color: var(--text-lighter);
  font-size: 11px;
  align-self: flex-end;
}
</style>
