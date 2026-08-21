import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CommentList from './CommentList.vue'

function mountList(comments) {
  return mount(CommentList, {
    props: { comments },
    global: {
      stubs: { 'van-icon': true }
    }
  })
}

describe('CommentList', () => {
  it('使用后端的顶层 nickname 字段渲染评论', () => {
    const wrapper = mountList([{ id: 1, nickname: '访客', content: '你好' }])

    expect(wrapper.find('.comment-nickname').text()).toBe('访客')
  })

  it('点击和键盘操作都能触发回复事件', async () => {
    const comment = { id: 1, nickname: '访客', content: '你好' }
    const wrapper = mountList([comment])
    const trigger = wrapper.find('.comment-preview-main')

    await trigger.trigger('click')
    await trigger.trigger('keydown', { key: 'Enter' })
    await trigger.trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('reply')).toHaveLength(3)
    expect(wrapper.emitted('reply')[0]).toEqual([comment])
  })

  it('超过预览数量时提供查看全部事件', async () => {
    const wrapper = mountList([
      { id: 1, nickname: '一', content: '1' },
      { id: 2, nickname: '二', content: '2' },
      { id: 3, nickname: '三', content: '3' },
      { id: 4, nickname: '四', content: '4' }
    ])

    await wrapper.find('.comment-more').trigger('click')

    expect(wrapper.emitted('view-all')).toHaveLength(1)
    expect(wrapper.findAll('.comment-preview').length).toBe(3)
  })
})
