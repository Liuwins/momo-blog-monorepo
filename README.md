# MomoBlog Monorepo

MomoBlog 是一个移动端优先、朋友圈风格的个人动态博客。本仓库统一管理前端、后端和项目级文档。

## 目录

```text
.
├── momo-blog/          # Vue 3 + Vite 前端
├── momo-blog-server/   # NestJS + SQLite 后端
├── docs/               # 当前部署与路线图
├── PROJECT-WIKI.md     # 项目架构、接口和维护 WIKI
└── ROADMAP.md          # 当前路线图
```

前后端仍保留各自的 `package.json`、`package-lock.json` 和构建脚本，统一使用 npm；暂不引入 npm workspaces，避免改变既有部署行为。

## 快速开始

后端：

```powershell
Set-Location .\momo-blog-server
Copy-Item .env.example .env
# 编辑 .env，设置强随机 JWT_SECRET
npm ci
npm run start:dev
```

前端（另开终端）：

```powershell
Set-Location .\momo-blog
npm ci
npm run dev
```

开发地址为 `http://localhost:5175`，Vite 会把 `/api`、`/images` 和 `/socket.io` 代理到后端 `http://localhost:3001`。端口被占用时不要换端口，先确认已有服务是否健康。

## 文档入口

- [PROJECT-WIKI.md](PROJECT-WIKI.md)：当前源码、路由、API、数据模型、鉴权和风险说明。
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)：当前 Docker Compose 与非 Docker 部署基线。
- [docs/OPTIMIZATION-PLAN.md](docs/OPTIMIZATION-PLAN.md)：分阶段优化任务、验收标准和回滚约定。
- [ROADMAP.md](ROADMAP.md)：当前已实现能力和待办事项。

根目录的旧部署文件和子项目旧 README/ROADMAP 仍保留路径，但只作为兼容说明，不再承载独立部署命令。

## 历史 GitHub 仓库

本 Monorepo 由以下两个已发布仓库合并而来，并保留完整提交历史：

- 前端：`https://github.com/Liuwins/momo-blog.git`
- 后端：`https://github.com/Liuwins/momo-blog-server.git`

两个旧仓库继续作为历史归档，不应把 Monorepo 根分支强推覆盖到其中任何一个。Monorepo 应使用新的 GitHub 仓库作为 `origin`。
