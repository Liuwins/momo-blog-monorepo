import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Publish from './Publish.vue'
import { createPost, getTags } from '@/api/post'
import { clearDraft, getDraft } from '@/utils/storage'
import { toast } from '@/utils/toast'

const routerMock = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
  useRoute: () => ({ query: {} })
}))

vi.mock('vant', () => ({
  showConfirmDialog: vi.fn(() => Promise.resolve())
}))

vi.mock('@/api/post', () => ({
  createPost: vi.fn(),
  getPostDetail: vi.fn(),
  updatePost: vi.fn(),
  getPostHistory: vi.fn(),
  restorePostHistory: vi.fn(),
  getTags: vi.fn()
}))

vi.mock('@/api/upload', () => ({
  uploadImages: vi.fn(),
  uploadVideo: vi.fn(),
  uploadAudio: vi.fn()
}))

vi.mock('@/utils/compress', () => ({ compressImage: vi.fn() }))

vi.mock('@/utils/storage', () => ({
  getDraft: vi.fn(),
  saveDraft: vi.fn(),
  clearDraft: vi.fn()
}))

vi.mock('@/utils/toast', () => ({
  toast: {
    fail: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  }
}))

vi.mock('@/components/MusicPlayer.vue', () => ({ default: { template: '<div />' } }))

const fieldStub = {
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

const passthroughStub = { template: '<div><slot /></div>' }
const buttonStub = { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }
const navBarStub = {
  emits: ['click-left', 'click-right'],
  template:
    '<div><button class="publish-trigger" @click="$emit(\'click-right\')">发布</button><slot /></div>'
}

function mountPublish() {
  return mount(Publish, {
    global: {
      stubs: {
        'van-nav-bar': navBarStub,
        'van-field': fieldStub,
        'van-uploader': passthroughStub,
        'van-button': buttonStub,
        'van-tag': passthroughStub,
        'van-icon': passthroughStub,
        'van-popup': passthroughStub,
        'van-loading': passthroughStub,
        'van-empty': passthroughStub,
        'van-cell-group': passthroughStub,
        'van-cell': passthroughStub
      }
    }
  })
}

describe('Publish view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerMock.back.mockReset()
    getTags.mockResolvedValue([])
    getDraft.mockReturnValue(null)
    createPost.mockResolvedValue({ id: 1 })
  })

  it('输入内容后点击顶部发布按钮会提交统一 payload 并返回上一页', async () => {
    const wrapper = mountPublish()
    const contentInput = wrapper.find('input')

    await contentInput.setValue('今天的动态')
    await wrapper.find('.publish-trigger').trigger('click')
    await flushPromises()

    expect(createPost).toHaveBeenCalledWith({
      content: '今天的动态',
      images: [],
      videos: [],
      music: '',
      tags: []
    })
    expect(clearDraft).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('发布成功')
    expect(routerMock.back).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('空内容不会发起发布请求', async () => {
    const wrapper = mountPublish()

    await wrapper.find('.publish-trigger').trigger('click')
    await flushPromises()

    expect(createPost).not.toHaveBeenCalled()
    expect(routerMock.back).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
