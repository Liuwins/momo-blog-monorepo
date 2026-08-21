# MomoBlog 项目 WIKI

> 基于工作区当前源码和本地验证，更新日期：2026-08-22；当前仓库已经迁移为 Monorepo。
>
> 本文以代码和下方验证记录为准，不以旧的 README、ROADMAP 或部署手册替代运行事实。线上域名、真实服务器和生产数据仍未验收；文末单列了已确认的待处理风险。

## 1. 项目概览

MomoBlog 是一个移动端优先、朋友圈风格的个人动态博客。它采用“公开浏览 + 单管理员维护”的模式：访客可查看动态、使用本地 visitorId 点赞和发表评论；管理员可登录后发布、编辑、删除动态，审核评论、上传媒体并维护个人主页。

当前工作区是一个统一的 Monorepo；前后端目录保留各自的 npm 项目边界，但共享根 Git 历史：

```text
项目根目录/
├── .git/                      # 唯一 Git 仓库
├── momo-blog/                 # Vue 3 前端
├── momo-blog-server/          # NestJS 后端
├── docs/DEPLOYMENT.md         # 当前部署基线
├── ROADMAP.md                 # 当前路线图
└── PROJECT-WIKI.md            # 本文
```

当前分析基线：

| 子项目 | 分支 | 当前提交 |
| --- | --- | --- |
| Monorepo 根 | `master` | 已领先远程 6 个本地提交；阶段 6 及容器/PWA 修复均已提交到本地，公开推送仍待最终审查 |
| 前端导入基线 | `legacy/frontend-master-20260821` | `425f812`（2026-08-12） |
| 后端导入基线 | `legacy/server-master-20260821` | `d60173c`（2026-08-12） |

### 总体架构

```text
浏览器
  │
  ├─ 开发环境：Vite :5175
  │              └─ /api、/images、/socket.io 代理至 NestJS
  │
  └─ 生产环境：Nginx :80 / HTTPS
                 ├─ Vue 静态资源与 SPA fallback
                 ├─ /api       → NestJS REST API
                 ├─ /images    → 上传文件静态服务
                 └─ /socket.io → Socket.IO 通知

NestJS :3001（代码默认值）
  ├─ TypeORM + better-sqlite3 → SQLite 数据库
  ├─ 本地文件系统             → 图片、视频、音频
  └─ Socket.IO /notifications → 实时通知
```

## 2. 技术栈与运行边界

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Vue 3、Vite 8、Vue Router 4、Pinia 3 | 单页应用，路由懒加载 |
| UI | Vant 4 | 移动端组件、上拉加载、下拉刷新、弹窗等 |
| 网络 | Axios、Socket.IO Client | REST 请求与通知长连接 |
| 后端 | NestJS 10、TypeORM 0.3 | REST API、校验、鉴权、模块化业务 |
| 数据 | SQLite / better-sqlite3 | 单文件数据库，适合单实例部署 |
| 媒体 | Multer、Sharp | 上传校验、图片转 WebP、多尺寸输出 |
| 运维 | Nginx、Docker Compose、PM2/systemd | 提供容器化和非容器化两种路径 |

两个子项目都有 `package-lock.json`，应统一使用 npm。安装依赖时优先使用 `npm ci`；不要在其中混用 pnpm、yarn 或 bun。

SQLite 存在单文件写锁，PM2 配置已明确指定 `instances: 1`。不要把后端横向扩展为多个写实例，除非先迁移到支持并发写入的数据库并调整事务策略。

## 3. 角色、业务能力与前端路由

### 角色模型

| 角色 | 身份来源 | 可执行操作 |
| --- | --- | --- |
| 访客 | 无 JWT；浏览器生成 `visitorId` | 浏览、搜索、查看详情、查看公开资料、点赞、评论、查看本地收藏/历史 |
| 管理员 | JWT；用户名必须等于 `ADMIN_USERNAME`，默认 `admin` | 所有访客能力，以及发布、编辑、删除、媒体上传、评论审核、资料/封面/背景音乐维护、通知中心、关注流 |

没有注册接口，也没有前端注册页。`AuthService` 只允许管理员用户名登录，因此当前业务是单用户个人博客，而不是可自行注册的社交网络。

### 前端路由

| 路由 | 页面 | 访问控制 | 主要能力 |
| --- | --- | --- | --- |
| `/` | `Home.vue` | 公开 | 动态流、搜索、排序、标签筛选、评论弹窗、封面、天气、每日一句 |
| `/login` | `Login.vue` | 访客入口；已登录会重定向首页 | 管理员登录 |
| `/publish` | `Publish.vue` | 必须登录 | 新建/编辑动态、图片/视频/音频、标签、草稿 |
| `/post/:id` | `PostDetail.vue` | 公开 | 动态详情、评论、回复、审核操作 |
| `/profile/:id?` | `Profile.vue` | 公开 | 个人资料、动态列表、关注；本人可编辑资料 |
| `/notifications` | `Notifications.vue` | 必须登录 | 通知分页、全部已读 |
| `/favorites` | `Favorites.vue` | 无路由守卫 | 本地收藏和浏览历史 |
| `/:pathMatch(.*)*` | `NotFound.vue` | 公开 | 404 页面 |

### 已实现的前端体验

- 首页支持关键字搜索、最新/最热排序、全量/本周热门标签以及登录后的关注流。
- 动态支持文本、Markdown 安全渲染、最多 9 张图片、最多 9 个视频、标签、点赞、评论预览与管理员编辑/删除。
- 访客评论必须提供昵称；未审核内容对访客显示脱敏占位文本，管理员可审核、拒绝或删除。
- 个人主页支持封面、头像、签名、背景图、背景音乐、暗黑模式和关注关系。
- 前端本地保存收藏、浏览历史、发布草稿、主题、游客身份与游客昵称，不会同步到后端。
- 天气组件会申请定位，再调用 BigDataCloud 逆地理编码和 Open-Meteo；数据在本地缓存 30 分钟。此功能依赖浏览器定位权限，生产环境应使用 HTTPS。
- 生产构建会提供 PWA manifest、192/512 图标和 Service Worker；Service Worker 只在生产环境注册，开发环境不会接管 Vite 资源。

## 4. 前端结构与状态流

```text
momo-blog/src/
├── api/          # Axios 封装及 REST API 函数
├── components/   # PostCard、媒体网格、音乐、评论等可复用组件
├── plugins/      # Toast/Dialog 全局封装
├── router/       # 路由与 requiresAuth 守卫
├── stores/       # Pinia：用户会话、通知 Socket.IO
├── styles/       # 全局变量、暗黑主题、响应式宽度
├── utils/        # 草稿/收藏、游客 ID、图片压缩、天气等
└── views/        # 路由页面
```

### 请求与会话

- Axios 的 `baseURL` 固定为 `/api`，请求拦截器从 `localStorage.token` 写入 `Authorization: Bearer <token>`。
- 响应遇到 401，或无 Token 时遇到 403，会清理用户会话并跳转登录页；已有 Token 的 403 只提示权限不足。
- JWT 后端有效期为 7 天；前端也以 7 天 TTL 写入 `token_expires`，刷新后从本地恢复 `user_info`。
- 用户相关状态在 `stores/user.js`，通知未读数与 Socket.IO 生命周期在 `stores/notification.js`。

### 本地存储键

| 键 | 内容 | 上限/有效期 |
| --- | --- | --- |
| `token`、`token_expires`、`user_info` | 登录会话 | 前端 TTL 7 天 |
| `visitorId`、`visitorNickname` | 未登录互动身份 | 未设自动过期 |
| `momo_favorites` | 收藏摘要 | 最多 200 条 |
| `momo_history` | 浏览历史摘要 | 最多 100 条 |
| `momo_draft` | 发布草稿 | 一份草稿，内容变动后 1 秒防抖保存 |
| `momo_theme` | light/dark | 持久化 |
| `momo_weather_cache` | 定位天气 | 30 分钟 |

## 5. 后端模块与数据模型

### 后端模块

| 模块 | 责任 |
| --- | --- |
| `auth` | 管理员登录、JWT 签发与验证 |
| `users` | 公开博主资料、个人资料、用户动态、粉丝/关注统计 |
| `posts` | 动态分页、搜索、排序、标签、增删改查、评论/点赞摘要 |
| `comments` | 游客或登录评论、回复、审核、删除、待审核列表 |
| `likes` | 用户或 visitorId 点赞切换、点赞计数、通知触发 |
| `follows` | 关注、取消关注、关注者动态流 |
| `notifications` | 通知 REST 查询、未读数、Socket.IO 推送 |
| `upload` | 管理员图片、视频、音频上传与格式/大小校验 |
| `og` | 为动态生成 Open Graph 分享 HTML |
| `health` | 数据库连通性健康检查 |

### 数据表

| 表 | 核心字段 | 关系与用途 |
| --- | --- | --- |
| `users` | `username`、`password`、`nickname`、`avatar`、`signature`、`bgImage`、`bgMusic` | 管理员账户与个人主页资料；密码只保存 bcrypt 哈希 |
| `posts` | `userId`、`content`、`images`、`videos`、`music`、`tags`、`likeCount`、`commentCount` | 动态主表；数组字段使用 TypeORM `simple-array` 存储 |
| `comments` | `postId`、`userId`、`visitorId`、`nickname`、`content`、`status`、回复字段 | 评论状态为 `pending`、`approved`、`rejected` |
| `likes` | `userId`、`visitorId`、`postId` | `(userId, postId)` 与 `(visitorId, postId)` 唯一，防止重复点赞 |
| `follows` | `followerId`、`followingId` | 关注关系唯一，两个 ID 均有索引 |
| `notifications` | `receiverId`、`senderId`、`type`、`postId`、`content`、`dedupeKey`、`isRead` | 点赞、评论、回复通知；`dedupeKey` 用于同一事件去重 |
| `post_revisions` | `postId`、`editorId`、`content`、`images`、`videos`、`music`、`tags`、`createdAt` | 动态编辑前的完整快照，可恢复为历史版本 |

生产模式下 `TypeORM` 会关闭 `synchronize`，并在启动时自动执行 `src/migrations/` 中的迁移；开发模式会启用 `synchronize`。阶段 6 新增 `1786600000000-AddPostRevisions` 和 `1786601000000-AddNotificationDedupeKey`；实体变更必须同步补充可回放的迁移，不要依赖生产自动同步表结构。

## 6. REST API 速查

所有控制器接口均有 `/api` 全局前缀；上传文件的公开访问路径为 `/images/*`，不带 `/api` 前缀。

### 认证与用户

| 方法 | 地址 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | 公开 | 管理员登录；`username` 3–20 字符，`password` 6–50 字符；5 次/分钟 |
| `GET` | `/api/users/owner` | 公开 | 获取管理员公开资料，不返回密码 |
| `GET` | `/api/users/me` | JWT | 当前用户资料 |
| `GET` | `/api/users/:id` | 可选 JWT | 用户资料、动态数、粉丝数、关注数、当前用户是否关注 |
| `PUT` | `/api/users/profile` | JWT | 更新昵称、头像、签名；背景图/背景音乐只允许管理员 |
| `GET` | `/api/users/:id/posts` | 公开 | 指定用户动态分页 |

### 动态、点赞与标签

| 方法 | 地址 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/posts` | 可选 JWT | `page`、`pageSize`、`keyword`、`sortBy=latest|hot`、`tag`；返回列表和总数 |
| `GET` | `/api/posts/tags` | 公开 | `period=week` 统计近 7 天，否则全部标签 |
| `GET` | `/api/posts/:id` | 可选 JWT | 动态详情、评论、点赞用户摘要 |
| `POST` | `/api/posts` | JWT | 新建动态；内容、图片、视频至少有一项；内容最多 2000 字，标签最多 5 个 |
| `PUT` | `/api/posts/:id` | JWT + 本人 | 更新动态 |
| `DELETE` | `/api/posts/:id` | JWT + 本人 | 删除动态 |
| `GET` | `/api/posts/:id/history` | JWT + 本人 | 查询动态编辑历史 |
| `POST` | `/api/posts/:id/history/:revisionId/restore` | JWT + 本人 | 将指定历史快照恢复为当前动态，并保存当前快照 |
| `POST` | `/api/posts/:id/like` | 可选 JWT | 登录用户按用户 ID 点赞；访客需传 `visitorId` |
| `GET` | `/api/posts/:id/like-status` | 可选 JWT | 查询当前用户或访客的点赞状态 |

### 评论、关注与通知

| 方法 | 地址 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/comments` | 可选 JWT | 新建评论；全部先进入 `pending`；支持回复字段 |
| `GET` | `/api/comments/post/:postId` | 可选 JWT | 访客不见已拒绝评论，待审核内容会脱敏；登录后可见原文 |
| `DELETE` | `/api/comments/:id` | JWT | 评论作者或动态作者可删除 |
| `POST` | `/api/comments/:id/approve` | JWT + 动态作者 | 通过评论 |
| `POST` | `/api/comments/:id/reject` | JWT + 动态作者 | 拒绝评论 |
| `GET` | `/api/comments/admin/pending` | JWT | 当前用户动态下的待审核评论分页 |
| `GET` | `/api/comments/admin/pending-count` | JWT | 当前用户待审核评论数 |
| `POST` | `/api/follows/:userId` | JWT | 关注；幂等且禁止关注自己 |
| `DELETE` | `/api/follows/:userId` | JWT | 取消关注；幂等 |
| `GET` | `/api/follows/posts` | JWT | 关注对象的动态流 |
| `GET` | `/api/notifications` | JWT | 通知分页 |
| `GET` | `/api/notifications/unread-count` | JWT | 未读数 |
| `POST` | `/api/notifications/read-all` | JWT | 全部标为已读 |

### 上传、分享与健康检查

| 方法 | 地址 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/upload` | JWT + 管理员 | 字段 `files`，1–9 张图片；每张 ≤ 5 MB，总量 ≤ 30 MB |
| `POST` | `/api/upload/video` | JWT + 管理员 | 字段 `file`，仅 MP4/WebM，≤ 50 MB |
| `POST` | `/api/upload/audio` | JWT + 管理员 | 字段 `file`，支持 MP3/WAV/OGG/AAC/M4A/FLAC/WebM，≤ 20 MB |
| `GET` | `/api/og/post/:id` | 公开 | 带 Open Graph 元数据的分享 HTML |
| `GET` | `/api/health` | 公开 | 执行 `SELECT 1`，返回服务状态、时间戳、运行时间 |

## 7. 实时通知与媒体链路

### Socket.IO

- 命名空间：`/notifications`。
- 客户端连接：`io('/notifications', { auth: { token }, transports: ['websocket'] })`。
- 服务端在握手中验证 JWT；无效或缺少 Token 会立即断开。
- 服务端推送 `notification` 和 `unreadUpdate`；客户端收到后更新 Pinia 未读数。
- 客户端可发送 `markRead`；后端按已认证用户身份清空未读数，忽略客户端伪造的用户 ID。
- 反向代理必须转发 `/socket.io/` 并包含 `Upgrade` / `Connection: upgrade` 头，否则通知 REST 页面仍可打开但实时推送失效。

### 上传后的文件布局

```text
UPLOAD_DIR/
└── <16 位随机十六进制目录>/
    ├── orig.webp / orig.gif      # 原始显示图
    ├── mid.webp                  # 最大宽度 750px
    ├── thumb.webp                # 最大宽度 320px
    ├── video.mp4 | video.webm
    └── <安全化原文件名>.<音频扩展名>
```

非 GIF 图片由 Sharp 解码验证，再生成三份 WebP；GIF 保留原文件。上传 API 返回原图 URL 和多尺寸信息，前端列表/详情会根据 URL 选择缩略图或中图。

## 8. 本地开发

### 前置条件

- 使用 Node.js 22（项目 Docker 镜像和 CI 均使用 Node 22；本地无 `.nvmrc` 时按工作区约定使用 Node 22）。
- 两个子项目分别安装依赖。
- 后端必须配置长度至少 16 字符的 `JWT_SECRET`，否则会拒绝启动。

### 推荐启动顺序

1. 后端：

   ```powershell
   Set-Location .\momo-blog-server
   Copy-Item .env.example .env       # 首次才需要；不要提交 .env
   # 编辑 .env：设置强 JWT_SECRET，并确认 PORT、DB_PATH、UPLOAD_DIR、CLIENT_ORIGIN、SITE_URL
   npm ci
   npm run start:dev
   ```

   `SEED_ADMIN_PASSWORD=<一次性演示密码> node dist/seed.js` 仅用于首次填充演示数据。它会清空现有用户、动态、评论、点赞等数据，绝不能在有价值的数据环境中直接运行；密码不会写入仓库或日志。

2. 前端（先保证代理目标与后端端口一致）：

   ```powershell
   Set-Location .\momo-blog
   npm ci
   $env:VITE_API_TARGET = 'http://localhost:3001'
   npm run dev
   ```

   Vite 端口固定为 `5175` 且 `strictPort: true`。启动前先检查该端口；如果已有监听且 `http://localhost:5175/` 返回 200，应直接复用，不要换端口或重复启动。

3. 健康检查：

   ```powershell
   Invoke-WebRequest http://localhost:3001/api/health -TimeoutSec 3
   Invoke-WebRequest http://localhost:5175/ -TimeoutSec 3
   ```

### 开发端口的重要说明

后端代码和 `.env.example` 默认监听 `3001`；前端 `.env.development` 也默认使用 `VITE_API_TARGET=http://localhost:3001`。`vite.config.js` 已显式调用 `loadEnv`，因此直接执行 `npm run dev` 即可读取开发配置；临时切换地址时覆盖同名环境变量即可。

## 9. 部署与运维

### Docker Compose 路径

从 Monorepo 根目录执行 `docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml up -d --build` 会构建（`.env` 只放服务器，不提交）：

- `backend`：容器内监听 3001，SQLite、图片和日志分别使用命名卷持久化；
- `frontend`：使用前端 Dockerfile 构建，Nginx 监听 80，代理 API、图片和 Socket.IO。

Docker 前端 Nginx 已将上传限制设为 `60m`，与后端最大 50 MB 视频限制兼容。Compose 默认只将后端 `3001` 绑定到 `127.0.0.1`；前端构建通过 `SITE_URL` 注入 `VITE_SITE_URL`，生产环境仍要在 `momo-blog-server/.env` 配置强 `JWT_SECRET`、正确的 `CLIENT_ORIGIN` 和 `SITE_URL`。

Compose 的 backend 已配置 `/api/health` 健康检查，并要求 frontend 等待 backend `healthy` 后再启动。健康检查返回 503 时表示数据库不可用或应用未就绪，不应把容器的 `running` 状态误认为部署成功。

### 非 Docker 路径

- 后端以 systemd 或 PM2 单实例运行；`ecosystem.config.js` 是 PM2 的备选配置。
- 前端构建产物放在 Nginx 静态目录；后端 `UPLOAD_DIR` 和 Nginx `/images/` 需要指向同一份上传文件。
- 后端生产模式会自动执行 TypeORM 迁移；部署前务必备份 SQLite。生产构建只加载 `src/migrations/` 下的迁移文件，测试文件放在迁移目录外，避免运行时依赖开发测试包。
- 健康检查端点为 `/api/health`，数据库查询失败时返回 HTTP 503，可用于负载均衡、Compose 和监控探针。

### 随仓库脚本

| 脚本 | 作用 | 使用前注意事项 |
| --- | --- | --- |
| `backup.sh` | SQLite 一致性备份、媒体归档、保留 7 天、可上传 OSS | 通过环境变量注入数据库/上传/备份路径、OSS endpoint/bucket 和凭据；未配置 OSS 时只保留本地成对备份，配置 OSS 时数据库与媒体归档一起上传 |
| `cert-check.sh` | 证书到期检查与续期 | 通过 `CERT_DOMAINS`、`CERT_ROOT` 和 `CERT_LOG` 注入环境值 |
| `cleanup-images.sh` | 清理未被数据库引用的媒体目录 | 默认只报告；完成备份并设置 `BACKUP_CONFIRMED=1 DRY_RUN=0` 后移入隔离区，不直接永久删除；覆盖动态图片/视频/配乐、头像、封面和背景音乐 |
| `restore-media-quarantine.sh` | 恢复媒体清理隔离区 | 指定 `RESTORE_RUN` 并确认备份后恢复，目标已存在时中止 |

## 10. 安全与可靠性措施

以下是源码中已实现的措施，未包含渗透测试或线上配置验证：

- NestJS 全局 `ValidationPipe` 启用 `whitelist`、`forbidNonWhitelisted` 和类型转换。
- 全局限流为每 IP 每分钟 60 次；登录单独收紧为每分钟 5 次。
- `NODE_ENV` 只允许 `development`、`test`、`production`；生产环境会强制校验 `JWT_SECRET`、`CLIENT_ORIGIN` 和 `SITE_URL`，并且只有明确的 `development` 才会启用 TypeORM `synchronize`。
- JWT 密钥缺失或少于 16 字符时，后端启动失败；JWT 签发有效期为 7 天。
- 密码使用 bcrypt（10 轮）哈希；用户对外响应会剔除 `password`。
- Helmet 安全头已启用；HTTP CORS 使用显式 `CLIENT_ORIGIN`，并开启 credentials。
- 上传入口同时受 JWT 和管理员守卫保护，校验 MIME、文件大小、文件头、图片真实解码和最大像素数；视频/音频检查基础容器签名，文件名使用随机目录并过滤危险字符。
- 动态分享页会转义用户文本，降低存储型 XSS 风险；Markdown 渲染端使用 DOMPurify。
- 前端 Nginx 发布 CSP、Permissions-Policy 和 Referrer-Policy；CSP 使用 `script-src 'self'`，不依赖 `unsafe-inline` 脚本。

## 11. 已确认的代码与文档差异 / 风险

| 优先级 | 已确认现象 | 影响 | 建议 |
| --- | --- | --- | --- |
| 已处理 | `CreatePostDto`/`UpdatePostDto`、前端发布页和实体都支持 `music`，但 PostsService 未写入或返回该字段 | 正常发布的动态配乐不会持久化，也无法在首页/详情重现 | 已在 PostsService 的创建、更新和列表/详情序列化处接入，并有回归测试覆盖 |
| 已处理 | 后端默认 `3001`，旧 Vite 代理示例为 `3009`，`.env.development` 曾使用未读取的 `VITE_API_URL` | 本地前后端按旧示例启动时 API 请求会失败 | 已统一为 `VITE_API_TARGET=http://localhost:3001`，并让 `vite.config.js` 显式加载 `.env` |
| 已处理 | 旧非 Docker Nginx 示例未配置 `/socket.io/`，且上传上限仅 10m | 实时通知无法升级 WebSocket；大文件被 Nginx 先拦截 | 已将当前基线收敛到 `docs/DEPLOYMENT.md`，要求完整代理配置和至少 60 MB 上传上限 |
| 已处理 | Docker Compose 曾将 `3001:3001` 暴露到宿主机，而部署基线要求后端不对外暴露 | API 可绕开前端 Nginx 直接访问 | 已改为默认 `127.0.0.1:${BACKEND_HOST_PORT:-3001}:3001`；仅在确认额外边界后调整 |
| 已处理 | 公开快照包含两个重复的初始化 migration，空库执行会在第二个 migration 创建已存在的 `comments` 表并失败 | 生产首次部署可能在迁移阶段失败 | 重复 migration 已改为兼容性 no-op；在内存 SQLite 空库和临时生产容器上验证三条 migration 可完整回放 |
| 已处理 | Compose 只按容器启动顺序启动 frontend，健康接口即使数据库查询失败也返回 HTTP 200 | 迁移失败或数据库锁定时可能被误判为已部署 | backend 增加 healthcheck，frontend 等待 `service_healthy`；数据库异常返回 HTTP 503 |
| 已处理 | `cleanup-images.sh` 只收集 `posts.images` 与 `users.avatar` 的引用 | 视频、动态配乐、背景图、背景音乐等仍在使用的文件可能被误删 | 已扩展到 videos/music/avatar/bgImage/bgMusic，并保持默认只报告模式 |
| 已处理 | 首页动态列表逐条查询评论、点赞状态和点赞用户，页面动态数量增加时查询次数线性增长 | 数据量增大后首页响应时间和数据库负载上升 | 已按当前页批量读取关联数据；已加入脱敏内存数据集基准，真实服务器延迟仍待测量 |
| 已处理 | posts、comments、notifications 高频过滤/排序字段缺少专用索引 | 数据量增长后列表、审核和未读数查询需要更多扫描 | 已新增索引 migration，并在临时 SQLite 和查询基准中验证使用情况 |
| 已处理 | 点赞记录和 posts.likeCount 原先不在同一个事务管理器中更新 | 并发或异常时可能出现点赞记录与计数不一致 | 已统一使用同一个 QueryRunner 事务更新记录和计数，并补充新增、取消和回滚测试 |
| 已处理 | 评论记录和 posts.commentCount 原先分开写入/删除 | 数据库异常或并发删除时可能出现评论数漂移 | 已统一评论创建、删除与计数更新事务，并在事务内复核待删除记录，补充提交、回滚和下界测试 |
| 已处理 | 关注流和个人页返回原始 Post/SQL 行，缺少当前用户点赞状态和评论/点赞摘要 | 同一条动态在首页、关注流、个人页的卡片字段不一致，前端需要重复适配 | 已统一由 PostsService 批量序列化三类动态流，并让个人页使用可选 JWT 上下文；补充关注流和个人页回归测试 |
| 已处理 | 关注操作采用“先查询后保存”，并发重复请求可能触发唯一约束错误 | 重复关注偶发返回 500，客户端状态不稳定 | 已改为利用唯一约束的数据库 `upsert`，重复请求保持幂等，并补充回归测试 |
| 已处理 | 媒体目录只有清理脚本，缺少可审计的容量、类型和孤立文件报告 | 媒体增长和清理候选缺少量化依据，误删风险较高 | 已新增只读 `media-report.js`；输出总量、扩展名、引用/孤立文件和字节数，清理仍需备份后显式开启 |
| 已处理 | 前端/后端旧 `ROADMAP.md` 曾写“通知中心 UI 未接”，但当前已有 `Notifications.vue`、通知 Pinia Store 和 Socket.IO 连接代码 | 旧路线图会误导维护 | 已收敛到根 `ROADMAP.md`，子项目文件改为入口说明 |
| 已处理 | `GET /api/users/:id/posts` 会查询 `p.music`，但正常创建流程不写入 `music` | 个人页与首页的动态模型可能出现字段能力不一致 | 已随动态配乐修复统一创建、更新及各查询返回，并有回归测试覆盖 |
| 已处理 | 前端配置了 Vitest，项目中未发现测试源码；后端没有测试脚本 | 关键鉴权、上传、审核和迁移缺少回归保护 | 已补前后端测试与 CI 基线；真实 GitHub CI、上传现场、WebSocket 现场和备份恢复仍需部署环境验收 |
| 已处理 | 前后端依赖审计发现上传解析链和前端测试工具链存在高危告警 | 公开仓库安装依赖后可能暴露已知 DoS/原型污染风险 | 已移除未使用的 `mockjs`，并通过 lockfile override 修复前端和后端生产链高危依赖；Nest 10 剩余中低风险需单独评估 Nest 11 升级 |
| 已处理 | 动态编辑没有可审计的历史版本，误编辑只能手工重建 | 内容恢复困难，管理员无法比较或回滚 | 新增 `post_revisions` 快照、历史查询和事务化恢复接口；真实服务器 migration 与大数据量保留策略仍需复演 |
| 已处理 | 点赞、评论和回复可能为同一事件重复创建通知，回复目标也可能跨动态伪造 | 通知中心噪声增加，可能把回复错误关联到其他动态 | 新增 `dedupeKey` 唯一去重、动态归属校验，并分别通知动态作者与原评论登录用户作者 |
| 已处理 | 仅依赖上传 MIME 值无法识别伪造扩展名或损坏图片 | 可能保存不可播放或不符合声明类型的媒体 | 新增文件头、图片解码、像素上限和视频/音频容器签名校验；真实设备和代表性媒体仍需现场复测 |

## 12. 维护约定

1. 修改实体时，同步新增迁移，并在生产前验证迁移和回滚策略。
2. 不要用 `seed.ts` 重置真实数据；它是演示数据初始化工具，不是安全的迁移工具。
3. 修改上传逻辑时，同时核对后端限制、前端预校验、Vite/Nginx `client_max_body_size`、清理脚本和备份策略。
4. 修改通知时，同时检查 REST 未读数、Socket.IO 鉴权、`/socket.io/` 反向代理和前端断线重连。
5. 修改鉴权时，明确选择 `JwtAuthGuard`（必需登录）还是 `OptionalJwtAuthGuard`（公开接口携带 Token 时补充用户上下文）。
6. 前端新增 API 时先写入 `src/api/`，再由页面/组件调用，保持 Axios 的统一错误处理。
7. 每次准备部署前至少执行依赖锁定安装、静态检查、构建、数据库备份和 `/api/health` 检查；这些检查不替代真实浏览器与生产环境冒烟测试。
8. 部署命令只从根 `docs/DEPLOYMENT.md` 获取；根 `AUTO-DEPLOY.md`、`DEPLOYMENT-CHECKLIST.md` 和子项目 `DEPLOY.md` 仅为兼容入口。

## 13. 关键源码索引

| 主题 | 首选入口 |
| --- | --- |
| 前端启动、代理、路由 | `momo-blog/src/main.ts`、`momo-blog/vite.config.js`、`momo-blog/src/router/index.js` |
| 前端请求与用户会话 | `momo-blog/src/api/request.js`、`momo-blog/src/stores/user.js` |
| 前端通知 | `momo-blog/src/stores/notification.js`、`momo-blog/src/views/Notifications.vue` |
| 后端启动与全局策略 | `momo-blog-server/src/main.ts`、`momo-blog-server/src/app.module.ts` |
| 鉴权 | `momo-blog-server/src/modules/auth/` |
| 动态、评论、点赞 | `momo-blog-server/src/modules/posts/`、`comments/`、`likes/` |
| 实时通知 | `momo-blog-server/src/modules/notifications/notifications.gateway.ts` |
| 上传安全 | `momo-blog-server/src/modules/upload/upload.controller.ts` |
| 表结构与迁移 | `momo-blog-server/src/entities/`、`momo-blog-server/src/migrations/` |
| 容器与 Nginx | `momo-blog-server/docker-compose.yml`、`momo-blog/Dockerfile`、`momo-blog/nginx.conf` |

## 14. 本次分析的验证范围

- 已完成静态审阅：Monorepo 目录、依赖锁文件、配置、路由、前端 API、状态管理、控制器、服务、实体、迁移、Docker/Nginx 和运维脚本。
- 本地自动化验证：前端测试 5/5、lint 0 error/0 warning、build 通过；后端测试 32/32、typecheck/build 通过；Compose 插值和 Bash 脚本语法通过；前端及后端生产依赖高危级别审计门禁通过（后端仍有 Nest 10 的低/中危告警，不能用 `npm audit fix --force` 处理）。
- 本地运行验证：Node 22 前后端生产镜像、隔离端口 Compose、migration、backend `healthy`、前端首页、`application/manifest+json` manifest、Service Worker、Nginx `/api/health`、Socket.IO polling 和 CSP/权限响应头均已通过；查询基准、媒体报告和隔离恢复演练通过；390×844 浏览器首页冒烟通过，控制台错误数为 0。
- 未完成：真实域名/HTTPS、目标服务器迁移、真实 WebSocket、上传、备份恢复、真实 PWA 安装和 GitHub 远程 CI 验收；本地验证不替代这些现场验证。

在把本文用于上线决策前，应按实际部署环境补做上述运行验证。
