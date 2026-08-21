# Changelog

本文件记录公开快照的重要变更。版本发布前先完成 CI、构建、迁移和部署清单验证；未经过真实环境验证的内容不会标记为生产已验证。

## [Unreleased]

- 完成阶段 1–5 的数据正确性、并发治理、查询基准、媒体隔离清理、移动端可访问性和依赖安全门禁。
- 增加 GitHub Issue/PR 模板和公开仓库敏感文件检查约定。
- 完成阶段 6 本地增强：PWA manifest/Service Worker、动态编辑历史与回滚、通知去重和回复边界校验、更严格媒体文件头/图片解码校验、CSP 与部署端口参数化。
- 阶段 6 本地回归通过：后端 32 条测试、前端 5 条测试，前端 lint、前后端 typecheck/build 和高危级别依赖审计通过。
- 后端升级至 NestJS 11（含 Config、JWT、Passport、TypeORM、WebSockets、CLI 和 Schematics）；后端 35 条测试、typecheck/build、官方 npm 生产依赖审计、隔离 Compose 和 GitHub Actions（运行 `32508220353`）验证通过，真实服务器仍需验收。
- 加固公开发布与部署运维：修复 Nginx SPA MIME 映射并补 `nosniff`，备份缺失数据库/媒体目录时主动失败，修正证书续期失败处理和媒体引用归一化；新增不带凭据的线上基础冒烟脚本与环境校验测试。
- 收紧动态与个人资料的媒体引用校验：仅允许同源路径或 `http(s)` URL，拒绝危险协议、路径穿越、控制字符和会破坏 `simple-array` 的逗号；新增前端请求/会话/发布/评论交互回归测试。
- 当前本地回归基线为前端 21 条、后端 53 条测试，均通过；新增资源路径、评论关联 ID、游客标识、查询边界和生产 CSP 校验；真实域名、HTTPS、目标服务器 migration、上传、WebSocket 和备份恢复仍需现场验收。
- GitHub Actions 已通过提交 `2aadbaa` 的前端、后端和仓库卫生门禁（运行 `32505266448`），并将 actions/checkout、actions/setup-node 升级到 v5。
- 后端 Node 22 镜像改为直接使用 better-sqlite3/sharp 预构建包，移除不必要的 Debian 编译工具下载；Nginx 补充 `webmanifest` MIME 类型；隔离端口完整 Compose、migration、健康检查、临时账号登录、图片上传/读取、编辑历史回滚、JWT WebSocket、Socket.IO polling 和 390×844 浏览器冒烟已通过。真实域名、HTTPS、目标服务器 migration 和备份恢复仍需现场验收。

## 发布约定

- 公开发布只从 `master` 分支产生，发布提交必须通过 GitHub Actions。
- 版本号和变更摘要在发布前更新本文件；数据库变更必须包含可回放 migration。
- 不在变更日志中记录密码、Token、服务器地址、绝对路径或用户数据。
