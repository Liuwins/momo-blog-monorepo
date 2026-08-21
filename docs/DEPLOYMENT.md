# MomoBlog 当前部署基线

状态：当前仓库的唯一部署参考。本文依据 `momo-blog/`、`momo-blog-server/`、Dockerfile、Compose 和 Nginx 配置整理；域名、服务器路径、证书和凭据仍需按目标环境填写。

## 1. 运行拓扑

```text
浏览器 → 前端 Nginx :80/443
          ├─ 静态 Vue SPA
          ├─ /api/       → backend:3001
          ├─ /images/    → backend:3001
          └─ /socket.io/ → backend:3001（WebSocket）

backend:3001 → SQLite + UPLOAD_DIR
```

Docker Compose 的后端服务端口是容器内 `3001`；前端 Nginx 通过 Compose 服务名 `backend` 访问它。生产环境不需要把后端端口暴露到公网。

## 2. 环境变量

在 `momo-blog-server/.env` 配置：

```env
NODE_ENV=production
PORT=3001
DB_PATH=/app/data/momoblog.db
JWT_SECRET=<至少 16 字符的强随机密钥>
CLIENT_ORIGIN=https://<实际域名>
SITE_URL=https://<实际域名>
UPLOAD_DIR=/app/images
# 本机验证或已有宿主机反向代理时可改为 39080；生产默认 80
FRONTEND_HOST_PORT=80
```

不要提交 `.env`。`JWT_SECRET`、`CLIENT_ORIGIN` 或 `SITE_URL` 缺失、格式不正确时，Compose 或后端会拒绝启动。

## 3. Docker Compose 部署

在 Monorepo 根目录执行（先将生产环境变量写入不入库的 `momo-blog-server/.env`）：

```powershell
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml config
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml up -d --build
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml ps
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml logs --tail=50 backend
```

Compose 会使用前端 Dockerfile 的构建上下文 `../momo-blog`，并持久化：

- `backend-data`：SQLite 数据库；
- `backend-images`：上传图片、视频、音频；
- `backend-logs`：应用日志。

`FRONTEND_HOST_PORT` 和 `FRONTEND_HOST_BIND` 只控制前端 Nginx 容器的宿主机映射，不改变容器内端口 80。这样本机已有 80 端口占用时可用临时端口验证完整前后端链路；生产仍建议由受控的 80/443 入口承载。

Compose 默认将后端绑定到宿主机回环地址（`127.0.0.1:3001:3001`），不会直接暴露到公网；如前端和后端只在 Compose 网络内通信，也可以移除该端口映射。不要改回 `3001:3001`，除非已确认有额外的防火墙和鉴权边界。

后端配置了 Docker healthcheck：只有 `/api/health` 返回 HTTP 200 且数据库查询成功后，前端容器才会启动。迁移失败、数据库锁定或数据目录不可用时，后端会保持 unhealthy，前端不会被误判为已部署；此时先查看 `docker compose ... logs --tail=100 backend`，修复配置或恢复备份后再重启。

前端 Dockerfile 使用 `SITE_URL` 作为 `VITE_SITE_URL` 构建参数，首页 Open Graph 元数据和后端分享页因此使用同一站点地址。前端同时发布 `manifest.webmanifest`、PWA 图标和生产 Service Worker；Nginx 响应头包含 CSP、Permissions-Policy 和 Referrer-Policy。生产部署前请在 Compose 使用的 `.env` 中同时配置 `SITE_URL` 与 `CLIENT_ORIGIN`。

## 4. 验证

```powershell
Invoke-WebRequest http://localhost/api/health -TimeoutSec 5
docker compose -f momo-blog-server/docker-compose.yml ps
```

应确认：

- 前端首页返回 200；
- `/api/health` 返回 `status: ok`；
- 后端日志无迁移失败；
- `docker compose ... ps` 中 backend 状态为 `healthy`、frontend 状态为 `running`；
- `/socket.io/` 代理包含 `Upgrade` 和 `Connection: upgrade`；
- 图片、视频、音频可以通过 `/images/` 访问。

本地端口被占用时，可使用不入库的环境变量验证 Compose 代理链路：

```powershell
$env:SITE_URL = 'http://localhost:39080'
$env:CLIENT_ORIGIN = 'http://localhost:39080'
$env:JWT_SECRET = '仅用于本地验证的长度足够随机值'
$env:FRONTEND_HOST_BIND = '127.0.0.1'
$env:FRONTEND_HOST_PORT = '39080'
$env:BACKEND_HOST_PORT = '39081'
docker compose --project-name momoblog-check -f momo-blog-server/docker-compose.yml up -d --build
Invoke-WebRequest http://localhost:39080/ -TimeoutSec 10
Invoke-WebRequest http://localhost:39080/manifest.webmanifest -TimeoutSec 10
Invoke-WebRequest http://localhost:39080/sw.js -TimeoutSec 10
Invoke-WebRequest http://localhost:39080/api/health -TimeoutSec 10
docker compose --project-name momoblog-check -f momo-blog-server/docker-compose.yml down -v
```

2026-08-22 本地回归已通过前后端测试、lint、typecheck 和 build；Node 22 完整 Compose 重建因外部 Debian 镜像源下载失败中断，因此上述容器链路、真实域名和目标服务器结果仍须按环境重新记录，不能仅凭构建日志宣称部署完成。

## 5. 非 Docker 部署

非 Docker 只作为需要 systemd/PM2 的服务器方案。后端工作目录为 `momo-blog-server`，监听端口建议仍使用 `3001`；前端构建后由 Nginx 提供静态文件。

运行时使用 Node.js 22（与 CI 和生产镜像保持一致）；当前后端上传类型校验锁定的 `file-type` 补丁版本要求 Node.js 20 或更高版本。

```powershell
# 后端
Set-Location .\momo-blog-server
npm ci
npm run build
npm run start:prod

# 前端
Set-Location ..\momo-blog
npm ci
npm run build
```

依赖安装必须使用仓库锁文件。发布前建议在可联网环境执行 `npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org`（后端）和 `npm audit --audit-level=high --registry=https://registry.npmjs.org`（前端）。当前前端审计为 0；后端生产链无高危项，但 Nest 10 仍有中低风险告警，升级 Nest 11 属于独立兼容性项目，不能在部署时执行 `npm audit fix --force`。

Nginx 至少需要以下路由：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /images/ {
    proxy_pass http://127.0.0.1:3001;
}

location /socket.io/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

上传上限至少设置为 `60m`，因为后端允许单个视频 50 MB。生产环境必须使用 HTTPS，天气定位和安全 Cookie/CORS 行为依赖正确的域名与协议配置。

## 6. 数据库、备份与回滚

- 生产模式使用 TypeORM migration，不要打开 `synchronize`。阶段 6 新增 `AddPostRevisions` 和 `AddNotificationDedupeKey` 两个迁移，升级前必须先完成数据库与媒体成对备份。
- `node dist/seed.js` 会清空数据，仅允许用于空库演示初始化；必须通过 `SEED_ADMIN_PASSWORD` 注入一次性演示密码，不能使用生产凭据。
- 执行升级前先备份 SQLite 和上传目录；`backup.sh` 会生成 SQLite 一致性快照 `momoblog.db.<时间>.bak` 和媒体归档 `momoblog-images.<时间>.tar.gz`，恢复时必须同时恢复数据库与媒体文件。
- Compose 首次启动或版本升级时会在 Nest 应用初始化阶段执行生产 migration；迁移失败不会跳过错误继续提供流量。确认日志中出现应用监听日志且 healthcheck 为 `healthy` 后，才视为迁移完成。
- `backup.sh`、`cert-check.sh`、`cleanup-images.sh` 和 `restore-media-quarantine.sh` 是参数化部署脚本模板：路径、域名、OSS 凭据和引用扫描范围需按环境审查；媒体清理默认只报告，完成成对备份后设置 `BACKUP_CONFIRMED=1 DRY_RUN=0` 会把候选移入隔离区而非直接删除，可用恢复脚本回滚。
- 上传接口除 MIME 白名单和大小限制外，还检查文件头、图片真实解码及像素上限；视频/音频容器签名不满足要求时会拒绝。真实服务器仍需用代表性文件复测。

备份恢复演练示例（已在隔离容器验证；目标部署机执行时不要覆盖生产目录）：

```bash
DB_PATH=/srv/momoblog/data/momoblog.db \
UPLOAD_DIR=/srv/momoblog/images \
BACKUP_DIR=/srv/momoblog/backups \
  ./momo-blog-server/backup.sh

# 恢复前停止应用；将数据库备份复制回 DB_PATH，并将媒体归档解压到 UPLOAD_DIR 的父目录。
sqlite3 /srv/momoblog/data/momoblog.db 'PRAGMA integrity_check;'
tar -xzf /srv/momoblog/backups/momoblog-images.<时间>.tar.gz -C /srv/momoblog/
```

## 7. 当前不做的假设

本文不假定生产域名、服务器绝对路径、证书位置、systemd 用户、OSS 凭据或公网端口。已有 `AUTO-DEPLOY.md`、`DEPLOYMENT-CHECKLIST.md` 和 `momo-blog-server/DEPLOY.md` 已降级为兼容入口，不应绕过本文直接执行旧命令。
