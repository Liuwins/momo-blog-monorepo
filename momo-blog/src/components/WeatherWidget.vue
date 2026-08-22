<template>
  <button
    class="weather-widget"
    type="button"
    :aria-label="weather ? `刷新${weather.city}天气` : error ? '天气暂不可用，点击重试' : '正在获取天气'"
    @click="refresh"
  >
    <template v-if="weather">
      <span class="weather-icon">{{ weather.icon }}</span>
      <span class="weather-city">{{ weather.city }}</span>
      <span class="weather-sep">·</span>
      <span class="weather-temp">{{ weather.temperature }}°</span>
      <span class="weather-label">{{ weather.label }}</span>
    </template>
    <template v-else-if="loading">
      <span class="weather-icon weather-loading-icon" aria-hidden="true">◌</span>
      <span class="weather-label">正在获取天气</span>
    </template>
    <template v-else-if="error">
      <span class="weather-icon" aria-hidden="true">⌁</span>
      <span class="weather-label">天气暂不可用 · 重试</span>
    </template>
    <template v-else>
      <span class="weather-icon" aria-hidden="true">⌁</span>
      <span class="weather-label">定位天气</span>
    </template>
  </button>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getLocationWeather } from '@/utils/weather'

const weather = ref(null)
const loading = ref(false)
const error = ref(false)

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = false
  try {
    weather.value = await getLocationWeather()
    if (!weather.value) error.value = true
  } catch {
    weather.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

function refresh() {
  // 用户主动点击：清除缓存重新获取
  try {
    localStorage.removeItem('momo_weather_cache')
  } catch {
    /* 忽略 */
  }
  weather.value = null
  load()
}

onMounted(load)
</script>

<style scoped>
.weather-widget {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tag);
  padding: 5px 9px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  border: 0;
  font: inherit;
}

.weather-widget:active {
  background: #eaeef3;
}

.weather-icon {
  font-size: 14px;
}

.weather-city {
  color: var(--text-primary);
  font-weight: 500;
}

.weather-sep {
  color: #ccc;
}

.weather-temp {
  color: var(--theme-color);
  font-weight: 650;
}

.weather-label {
  color: var(--text-light);
  white-space: nowrap;
}

.weather-loading-icon {
  animation: weather-spin 1.1s linear infinite;
}

@keyframes weather-spin {
  to { transform: rotate(360deg); }
}
</style>
