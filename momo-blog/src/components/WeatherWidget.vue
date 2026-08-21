<template>
  <!-- 加载中或失败均静默隐藏，避免打扰用户 -->
  <div v-if="weather" class="weather-widget" @click="refresh">
    <span class="weather-icon">{{ weather.icon }}</span>
    <span class="weather-city">{{ weather.city }}</span>
    <span class="weather-sep">·</span>
    <span class="weather-temp">{{ weather.temperature }}°</span>
    <span class="weather-label">{{ weather.label }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getLocationWeather } from '@/utils/weather'

const weather = ref(null)

async function load() {
  // 静默失败：任何环节出错都返回 null，组件不显示
  weather.value = await getLocationWeather()
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
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
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
  font-weight: 600;
}

.weather-label {
  color: var(--text-light);
}
</style>
