# 后端部署入口

后端部署已统一到根目录 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)。

当前基线：后端默认监听 `3001`；生产模式使用 TypeORM 迁移；上传目录、SQLite 和日志必须持久化；Nginx 必须代理 `/api/`、`/images/` 与 `/socket.io/`。

本文档保留是为了兼容旧链接，不再维护独立的域名、绝对路径或 systemd 命令。
