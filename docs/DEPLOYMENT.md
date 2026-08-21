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

Compose 默认将后端绑定到宿主机回环地址（`127.0.0.1:3001:3001`），不会直接暴露到公网；如前端和后端只在 Compose 网络内通信，也可以移除该端口映射。不要改回 `3001:3001`，除非已确认有额外的防火墙和鉴权边界。

后端配置了 Docker healthcheck：只有 `/api/health` 返回 HTTP 200 且数据库查询成功后，前端容器才会启动。迁移失败、数据库锁定或数据目录不可用时，后端会保持 unhealthy，前端不会被误判为已部署；此时先查看 `docker compose ... logs --tail=100 backend`，修复配置或恢复备份后再重启。

前端 Dockerfile 使用 `SITE_URL` 作为 `VITE_SITE_URL` 构建参数，首页 Open Graph 元数据和后端分享页因此使用同一站点地址。生产部署前请在 Compose 使用的 `.env` 中同时配置 `SITE_URL` 与 `CLIENT_ORIGIN`。

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

## 5. 非 Docker 部署

非 Docker 只作为需要 systemd/PM2 的服务器方案。后端工作目录为 `momo-blog-server`，监听端口建议仍使用 `3001`；前端构建后由 Nginx 提供静态文件。

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

- 生产模式使用 TypeORM migration，不要打开 `synchronize`。
- `node dist/seed.js` 会清空数据，仅允许用于空库演示初始化；必须通过 `SEED_ADMIN_PASSWORD` 注入一次性演示密码，不能使用生产凭据。
- 执行升级前先备份 SQLite 和上传目录；恢复时必须同时恢复数据库与媒体文件。
- Compose 首次启动或版本升级时会在 Nest 应用初始化阶段执行生产 migration；迁移失败不会跳过错误继续提供流量。确认日志中出现应用监听日志且 healthcheck 为 `healthy` 后，才视为迁移完成。
- `backup.sh`、`cert-check.sh`、`cleanup-images.sh` 是参数化部署脚本模板：路径、域名、OSS 凭据和引用扫描范围需按环境审查；媒体清理脚本默认只报告，确认后才可设置 `DRY_RUN=0`。

## 7. 当前不做的假设

本文不假定生产域名、服务器绝对路径、证书位置、systemd 用户、OSS 凭据或公网端口。已有 `AUTO-DEPLOY.md`、`DEPLOYMENT-CHECKLIST.md` 和 `momo-blog-server/DEPLOY.md` 已降级为兼容入口，不应绕过本文直接执行旧命令。
