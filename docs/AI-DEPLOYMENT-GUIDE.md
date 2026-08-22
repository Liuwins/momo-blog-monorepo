# MomoBlog AI 上线部署指南

> 面向开发者、站点维护者和协助部署的 AI 助手。本文描述当前 Monorepo 的真实部署边界。
>
> 当前仓库提供 Docker Compose、生产 migration、健康检查、备份和线上基础冒烟脚本，但尚未提供“网页初始化向导”或云厂商 DNS 自动配置。生产密码、JWT 密钥、SSH 私钥、证书和 OSS 凭据不得写入仓库或发送到聊天中。

## 1. 给 AI 的部署任务模板

可以把下面的内容连同仓库路径交给 AI。不要把密码、Token、私钥或证书内容粘贴到对话中。

~~~text
请在这台服务器部署 MomoBlog Monorepo。

仓库地址：<Monorepo URL>
部署版本：<Git tag 或 commit，不要默认使用未审阅的 master>
部署目录：<绝对路径>
站点域名：https://<实际域名>
前置条件：Docker Engine、Docker Compose plugin、Git、HTTPS 入口已准备

要求：
1. 先只读检查操作系统、Docker、磁盘、80/443 端口、DNS 和当前容器，不要立即修改文件。
2. 只使用仓库锁定版本和 Docker Compose；不要执行 curl | bash，不要使用旧仓库。
3. 生产环境必须使用 NODE_ENV=production、强随机 JWT_SECRET、正确的 CLIENT_ORIGIN 和 SITE_URL。
4. 不要在聊天、日志或 Git 中输出密码、Token、私钥、证书或完整 .env。
5. 部署前先确认数据库和上传目录是否已有数据；非空数据禁止运行 seed。
6. 先备份，再执行 docker compose config 和 docker compose up -d --build。
7. 等待 backend healthy 后，检查首页、/api/health、manifest、Service Worker、Socket.IO polling 和安全响应头。
8. 如果需要迁移、恢复、删除、覆盖或修改 DNS，先说明影响并等待我确认。
9. 最后只报告：版本、容器状态、健康检查、访问地址、未完成的生产验收项；不要报告任何秘密值。
~~~
AI 不应把“本地 build 通过”写成“生产部署成功”。生产结论必须以目标服务器上的健康检查和脱敏验收记录为准。

## 2. 上线前必须准备的信息

| 项目 | 要求 |
| --- | --- |
| 服务器 | Linux 推荐；至少 2 CPU、2 GB RAM、20 GB 可用磁盘，媒体较多时需要更多空间 |
| 软件 | Docker Engine、Docker Compose plugin、Git；生产镜像使用 Node.js 22，不需要宿主机安装 Node |
| 域名 | A/AAAA 记录指向服务器；80/443 入站端口可用 |
| HTTPS | Caddy、宿主机 Nginx、云负载均衡或其他 TLS 入口；不能依赖 HTTP 生产运行 |
| 版本 | Git tag 或完整 commit；不要把未审阅的工作区直接部署到生产 |
| 账号 | 管理员用户名和新设置的强密码；密码只在服务器交互输入 |
| 存储 | SQLite 数据目录、媒体目录和备份目录需要持久化，不能只存在容器可写层 |

DNS、云防火墙和证书申请属于服务器/云平台操作，不是仓库代码可以凭空完成的步骤。不要把云厂商 Access Key 提交到公开仓库。

## 3. 推荐拓扑

生产建议由主机上的 HTTPS 入口负责证书，Compose 前端只绑定回环地址：

~~~text
浏览器
  │ HTTPS :443
  ▼
Caddy / Nginx（主机）
  │ http://127.0.0.1:8080
  ▼
Compose frontend（Nginx）
  │ /api、/images、/socket.io
  ▼
Compose backend :3001
  │
  ├─ SQLite
  └─ images / logs
~~~

后端 3001 不应直接暴露公网。当前 Compose 默认将后端映射到 127.0.0.1；通过 BACKEND_HOST_PORT 仅用于本机排查，不要改成全网卡暴露。

## 4. 获取固定版本

以下命令在服务器执行。把占位符替换为实际值；不要把真实凭据写入命令历史。

~~~bash
git clone <Monorepo URL> /srv/momoblog
cd /srv/momoblog
git fetch --tags --force
git checkout <GIT_TAG_OR_COMMIT>
git status --short --branch
~~~

如果仓库没有发布 tag，使用已通过 CI 的完整 commit，并记录在部署单中。生产升级前先确认工作区干净。

## 5. 生成生产环境文件

在服务器上创建 momo-blog-server/.env，文件权限设置为 600。该文件已被 Git 忽略，不得上传到公开仓库。

推荐由主机 HTTPS 入口占用 80/443，因此 Compose 前端绑定 127.0.0.1:8080：

~~~env
NODE_ENV=production
PORT=3001
DB_PATH=/app/data/momoblog.db
JWT_SECRET=<在服务器本地生成的至少 32 字节随机值>
CLIENT_ORIGIN=https://<实际域名>
SITE_URL=https://<实际域名>
UPLOAD_DIR=/app/images
FRONTEND_HOST_BIND=127.0.0.1
FRONTEND_HOST_PORT=8080
BACKEND_HOST_PORT=3001
~~~

生成密钥时可以在服务器本地执行：

~~~bash
openssl rand -hex 32
~~~

只把输出粘贴到服务器的 .env，不要粘贴到聊天或提交记录。CLIENT_ORIGIN 和 SITE_URL 必须是完整的 https:// 源地址，不能带路径、查询参数或尾部额外路径。

校验配置，但不要打印完整 .env：

~~~bash
chmod 600 momo-blog-server/.env
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml config >/tmp/momoblog-compose.config
~~~

如果校验失败，先修复缺失变量、域名格式或端口冲突，不要强行启动。

## 6. 配置 HTTPS 入口

### Caddy 示例

Caddy 在主机上监听 80/443，并自动申请和续期证书：

~~~caddyfile
<实际域名> {
    reverse_proxy 127.0.0.1:8080
}
~~~

确认 DNS 已生效、80/443 未被其他服务占用后再启动 Caddy。Caddy 会转发 WebSocket，不要额外把后端端口暴露给公网。

### Nginx 示例

宿主机 Nginx 至少需要把站点和 WebSocket 代理到 127.0.0.1:8080；证书配置应由服务器已有的证书管理流程负责。不要把本文中的示例证书路径当成真实路径。

~~~nginx
server {
    listen 443 ssl http2;
    server_name <实际域名>;

    client_max_body_size 60m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
~~~

真实配置还需要 HTTP 到 HTTPS 跳转、证书路径、续期和防火墙策略。证书内容和私钥不属于仓库部署材料。

## 7. 启动生产容器

首次部署和版本升级都使用同一组命令：

~~~bash
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml up -d --build
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml ps
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml logs --tail=100 backend
~~~

生产容器会自动执行 TypeORM migration，并等待 /api/health 返回 200 后再启动前端。迁移失败、数据库锁定、目录不可写或 JWT 配置错误时，不能把容器 running 视为部署成功。

## 8. 首次创建管理员账号

当前仓库还没有非破坏性的网页初始化向导。dist/seed.js 仅用于空库演示初始化，并且会清空用户、动态、评论和点赞。生产环境使用前必须先确认数据库为空。

先查看数量，不要输出密码或数据库文件内容：

~~~bash
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml run --rm --no-deps backend node -e "const D=require('better-sqlite3');const d=new D('/app/data/momoblog.db',{readonly:true});console.log(d.prepare('select count(*) as users from users').get(),d.prepare('select count(*) as posts from posts').get());d.close()"
~~~

只有 users=0 且确认这是新部署时，才可以交互式执行 seed：

~~~bash
read -r -s SEED_ADMIN_PASSWORD
export SEED_ADMIN_PASSWORD
docker compose --env-file momo-blog-server/.env -f momo-blog-server/docker-compose.yml run --rm --no-deps -e SEED_ADMIN_PASSWORD backend node dist/seed.js
unset SEED_ADMIN_PASSWORD
~~~

默认账号名是 admin；如果需要其他账号名，可在服务器环境中额外设置 SEED_ADMIN_USERNAME，不要把它写入公开文档中的真实值。seed 完成后应立即登录并修改个人资料。非空数据库禁止执行上述命令。

## 9. 生产验收

先执行不带账号的公开冒烟检查：

~~~bash
BASE_URL=https://<实际域名> ./momo-blog-server/scripts/production-smoke.sh
~~~

应确认：首页返回 200 且是 HTML、/api/health 返回 200、manifest 和 Service Worker MIME 正确、安全响应头存在、Socket.IO polling 成功，并且生产域名强制 HTTPS。

登录后还要人工或浏览器自动化验收：

- 管理员登录、退出和过期会话；
- 发布、编辑、删除动态；
- 图片、MP4/WebM、音频上传与读取；
- 首页封面视频和个人主页封面视频；
- 通知实时推送、单条已读和全部已读；
- 评论审核、点赞和关注；
- 手机视口、PWA 更新和天气定位；
- 备份、恢复和 SQLite PRAGMA integrity_check。

结果应记录到 PRODUCTION-ACCEPTANCE.md，只填写脱敏信息。真实服务器验收不能由本地测试替代。

## 10. 更新、备份与回滚

更新前先停止写入或安排维护窗口，并同时备份数据库与媒体：

~~~bash
DB_PATH=/srv/momoblog-data/momoblog.db UPLOAD_DIR=/srv/momoblog-images BACKUP_DIR=/srv/momoblog-backups ./momo-blog-server/backup.sh
~~~

然后切换到新的 tag/commit，重新执行 docker compose ... up -d --build。生产 migration 只能向前执行；如果升级后的代码或数据不兼容，不要直接运行 migration:revert 或删除卷，应先停止服务、恢复成对备份，再切回已知可用版本。

媒体清理脚本默认只报告：

~~~bash
./momo-blog-server/cleanup-images.sh
~~~

只有完成备份并人工确认报告后，才允许使用 BACKUP_CONFIRMED=1 DRY_RUN=0 将候选移入隔离区。不要直接永久删除上传目录。

## 11. 常见故障定位

| 现象 | 优先检查 |
| --- | --- |
| 容器启动但页面打不开 | docker compose ps、宿主机 80/443/8080 端口、Caddy/Nginx 日志 |
| backend unhealthy | docker compose logs backend、JWT_SECRET、数据库权限、migration 错误 |
| 首页正常但 API 失败 | CLIENT_ORIGIN、Compose frontend 代理、backend health、浏览器 Network |
| 上传失败 | 主机和容器 client_max_body_size 是否至少 60m、媒体目录权限、文件 MIME/文件头 |
| 通知不实时 | /socket.io/ 的 Upgrade/Connection 头、HTTPS 混合内容、浏览器控制台 |
| 登录账号不一致 | 检查 DB_PATH/Compose volume；不要执行 seed 覆盖已有数据库 |
| 更新后页面仍是旧版 | 清理/更新 Service Worker、强制刷新、检查新版本构建是否成功 |
| SQLite locked | 确认只有一个 backend 实例，停止重复的 PM2/Compose 服务，不要横向扩展 SQLite 写实例 |

## 12. AI 执行边界

AI 可以自动执行只读检查、构建、配置校验、容器启动和健康检查；以下操作必须先明确确认：

- 删除、覆盖或恢复生产数据库和上传目录；
- 执行会清空数据的 seed；
- 修改 DNS、证书、云防火墙或访问权限；
- 读取、复制、发送或记录密码、Token、私钥、证书和 OSS 凭据；
- 把生产域名、用户数据或日志上传到第三方服务。

部署完成的最低报告格式：

~~~text
版本：<tag 或 commit>
容器：backend healthy / frontend running
公开冒烟：通过 / 未通过（附脱敏失败项）
登录与上传：已验收 / 未验收
备份恢复：已演练 / 未演练
生产遗留项：<列表>
~~~
