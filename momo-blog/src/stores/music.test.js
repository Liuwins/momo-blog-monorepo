import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBackgroundMusicStore } from '@/stores/music'

function createAudioMock() {
  const audio = document.createElement('audio')
  Object.defineProperty(audio, 'duration', {
    configurable: true,
    get: () => 120
  })
  Object.defineProperty(audio, 'buffered', {
    configurable: true,
    get: () => ({ length: 0 })
  })
  audio.load = vi.fn()
  audio.play = vi.fn().mockResolvedValue(undefined)
  audio.pause = vi.fn()
  audio.removeAttribute = vi.fn()
  return audio
}

describe('background music store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('同一首音乐不重复加载，保持路由切换后的进度', () => {
    const store = useBackgroundMusicStore()
    const audio = createAudioMock()
    store.attachAudio(audio)

    store.setTrack('/images/music.mp3')
    audio.currentTime = 42
    store.onTimeUpdate()
    store.setTrack('/images/music.mp3')

    expect(audio.load).toHaveBeenCalledTimes(1)
    expect(store.currentTime).toBe(42)
    expect(store.src).toContain('/images/music.mp3')
  })

  it('切换歌曲时重置进度，并支持播放和暂停', () => {
    const store = useBackgroundMusicStore()
    const audio = createAudioMock()
    store.attachAudio(audio)

    store.setTrack('/images/first.mp3')
    audio.currentTime = 18
    store.onTimeUpdate()
    store.setTrack('/images/second.mp3')

    expect(store.currentTime).toBe(0)
    expect(store.isLoading).toBe(true)

    store.play()
    expect(audio.play).toHaveBeenCalledTimes(1)
    store.onPlay()
    expect(store.isPlaying).toBe(true)
    store.pause()
    expect(audio.pause).toHaveBeenCalled()
    store.onPause()
    expect(store.isPlaying).toBe(false)
  })

  it('清理背景音乐时移除音频源', () => {
    const store = useBackgroundMusicStore()
    const audio = createAudioMock()
    store.attachAudio(audio)
    store.setTrack('/images/music.mp3')

    store.clearTrack()

    expect(store.src).toBe('')
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(audio.load).toHaveBeenCalledTimes(2)
  })
})
