<template>
  <div class="markdown-body" v-html="rendered" />
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  content: { type: String, default: '' }
})

// 配置 marked（安全模式）
marked.setOptions({
  gfm: true,
  breaks: true // 朋友圈风格：单换行即换行
})

// 用 DOMPurify hook 安全地为所有 <a> 标签添加 target 和 rel 属性
// 避免正则替换导致的重复属性和误替换问题
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const rendered = computed(() => {
  if (!props.content) return ''
  const html = marked.parse(props.content)
  // XSS 过滤：清理危险标签/事件处理器，hook 自动添加 target/rel
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target']
  })
})
</script>

<style scoped>
.markdown-body {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
  word-break: break-word;
}

/* 标题 */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  font-weight: 600;
  margin: 12px 0 8px;
  line-height: 1.4;
}

.markdown-body h1 {
  font-size: 20px;
}
.markdown-body h2 {
  font-size: 18px;
}
.markdown-body h3 {
  font-size: 16px;
}
.markdown-body h4 {
  font-size: 15px;
}

/* 段落 */
.markdown-body p {
  margin: 6px 0;
}

/* 粗体/斜体 */
.markdown-body strong {
  font-weight: 600;
}
.markdown-body em {
  font-style: italic;
}

/* 链接 */
.markdown-body a {
  color: #576b95;
  text-decoration: none;
  word-break: break-all;
}

/* 列表 */
.markdown-body ul,
.markdown-body ol {
  margin: 6px 0;
  padding-left: 20px;
}

.markdown-body li {
  margin: 3px 0;
}

/* 代码 */
.markdown-body code {
  background: #f5f5f5;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 13px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  color: #d63384;
}

.markdown-body pre {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-body pre code {
  background: transparent;
  padding: 0;
  color: #24292f;
}

/* 引用 */
.markdown-body blockquote {
  border-left: 3px solid #07c160;
  padding: 4px 12px;
  color: #666;
  background: #f8f9fa;
  margin: 8px 0;
  border-radius: 0 4px 4px 0;
}

/* 图片（内嵌 markdown 图片，限宽） */
.markdown-body img {
  max-width: 100%;
  border-radius: 6px;
  display: block;
  margin: 8px 0;
}

/* 分割线 */
.markdown-body hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 12px 0;
}

/* 表格 */
.markdown-body table {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #e5e5e5;
  padding: 6px 10px;
  font-size: 14px;
}

.markdown-body th {
  background: #f5f5f5;
  font-weight: 600;
}
</style>
