# Changelog

本文件记录公开快照的重要变更。版本发布前先完成 CI、构建、迁移和部署清单验证；未经过真实环境验证的内容不会标记为生产已验证。

## [Unreleased]

- 完成阶段 1–5 的数据正确性、并发治理、查询基准、媒体隔离清理、移动端可访问性和依赖安全门禁。
- 增加 GitHub Issue/PR 模板和公开仓库敏感文件检查约定。
- 完成阶段 6 本地增强：PWA manifest/Service Worker、动态编辑历史与回滚、通知去重和回复边界校验、更严格媒体文件头/图片解码校验、CSP 与部署端口参数化。
- 阶段 6 本地回归通过：后端 32 条测试、前端 5 条测试，前端 lint、前后端 typecheck/build 和高危级别依赖审计通过。
- 后端 Node 22 镜像改为直接使用 better-sqlite3/sharp 预构建包，移除不必要的 Debian 编译工具下载；Nginx 补充 `webmanifest` MIME 类型；隔离端口完整 Compose、migration、健康检查、临时账号登录、图片上传/读取、编辑历史回滚、JWT WebSocket、Socket.IO polling 和 390×844 浏览器冒烟已通过。真实域名、HTTPS、目标服务器 migration 和备份恢复仍需现场验收。

## 发布约定

- 公开发布只从 `master` 分支产生，发布提交必须通过 GitHub Actions。
- 版本号和变更摘要在发布前更新本文件；数据库变更必须包含可回放 migration。
- 不在变更日志中记录密码、Token、服务器地址、绝对路径或用户数据。
