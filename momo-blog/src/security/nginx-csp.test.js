import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const nginxConfig = fs.readFileSync(path.resolve(process.cwd(), 'nginx.conf'), 'utf8')

describe('生产 CSP', () => {
  it('允许天气和一言功能访问各自的同源外部接口', () => {
    expect(nginxConfig).toMatch(/connect-src[^;]*https:\/\/api\.bigdatacloud\.net/)
    expect(nginxConfig).toMatch(/connect-src[^;]*https:\/\/api\.open-meteo\.com/)
    expect(nginxConfig).toMatch(/connect-src[^;]*https:\/\/v1\.hitokoto\.cn/)
  })

  it('继续禁止对象、iframe 和任意脚本注入', () => {
    expect(nginxConfig).toContain("object-src 'none'")
    expect(nginxConfig).toContain("frame-ancestors 'none'")
    expect(nginxConfig).toContain("script-src 'self'")
  })
})
