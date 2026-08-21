/**
 * 定位 + 天气获取（无需 API key）
 * - 定位：浏览器原生 navigator.geolocation
 * - 逆地理编码：BigDataCloud 免费客户端 API
 * - 天气：Open-Meteo 开放 API
 */

const CACHE_KEY = 'momo_weather_cache'
// 缓存有效期：30 分钟（天气数据无需频繁刷新）
const CACHE_TTL = 30 * 60 * 1000

// WMO 天气代码 -> 中文描述 + 图标映射
const WMO_CODE_MAP = {
  0: { label: '晴', icon: '☀️' },
  1: { label: '晴', icon: '🌤️' },
  2: { label: '多云', icon: '⛅' },
  3: { label: '阴', icon: '☁️' },
  45: { label: '雾', icon: '🌫️' },
  48: { label: '雾凇', icon: '🌫️' },
  51: { label: '毛毛雨', icon: '🌦️' },
  53: { label: '毛毛雨', icon: '🌦️' },
  55: { label: '毛毛雨', icon: '🌦️' },
  56: { label: '冻雨', icon: '🌧️' },
  57: { label: '冻雨', icon: '🌧️' },
  61: { label: '小雨', icon: '🌧️' },
  63: { label: '中雨', icon: '🌧️' },
  65: { label: '大雨', icon: '🌧️' },
  66: { label: '冻雨', icon: '🌧️' },
  67: { label: '冻雨', icon: '🌧️' },
  71: { label: '小雪', icon: '🌨️' },
  73: { label: '中雪', icon: '🌨️' },
  75: { label: '大雪', icon: '❄️' },
  77: { label: '阵雪', icon: '🌨️' },
  80: { label: '阵雨', icon: '🌦️' },
  81: { label: '阵雨', icon: '🌧️' },
  82: { label: '暴雨', icon: '⛈️' },
  85: { label: '阵雪', icon: '🌨️' },
  86: { label: '阵雪', icon: '🌨️' },
  95: { label: '雷暴', icon: '⛈️' },
  96: { label: '雷暴', icon: '⛈️' },
  99: { label: '雷暴', icon: '⛈️' }
}

function getWeatherInfo(code) {
  return WMO_CODE_MAP[code] || { label: '未知', icon: '🌡️' }
}

/**
 * 获取定位（浏览器原生）
 * 失败时返回 null（用户拒绝或不支持）
 */
function getPosition() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null)
      return
    }
    // 超时 8s，避免长时间等待
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    )
  })
}

/**
 * 逆地理编码：坐标 -> 城市
 * BigDataCloud 免费客户端 API，无需 key
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    // 优先级：city -> locality -> principalSubdivision
    const city = data.city || data.locality || data.principalSubdivision || ''
    return city || null
  } catch {
    return null
  }
}

/**
 * 获取天气数据
 * Open-Meteo 开放 API，无需 key
 */
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const cur = data?.current
    if (!cur) return null
    const info = getWeatherInfo(cur.weather_code)
    return {
      temperature: Math.round(cur.temperature_2m),
      code: cur.weather_code,
      label: info.label,
      icon: info.icon
    }
  } catch {
    return null
  }
}

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

/**
 * 获取定位 + 天气（带缓存）
 * 返回: { city, temperature, label, icon } 或 null（任何环节失败均返回 null，调用方静默处理）
 */
export async function getLocationWeather() {
  // 1. 命中缓存直接返回
  const cached = readCache()
  if (cached) {
    const { ts, ...rest } = cached
    return rest
  }

  // 2. 获取定位
  const pos = await getPosition()
  if (!pos) return null

  // 3. 并行获取城市和天气
  const [city, weather] = await Promise.all([
    reverseGeocode(pos.lat, pos.lon),
    fetchWeather(pos.lat, pos.lon)
  ])

  if (!weather) return null

  const result = {
    city: city || '未知',
    temperature: weather.temperature,
    label: weather.label,
    icon: weather.icon,
    code: weather.code
  }

  writeCache(result)
  return result
}
