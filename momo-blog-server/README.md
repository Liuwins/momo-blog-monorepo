# MomoBlog 后端

NestJS + TypeORM + better-sqlite3，提供 REST API、Socket.IO 通知、SQLite 持久化和媒体上传。

## 本地开发

```powershell
npm ci
Copy-Item .env.example .env
# 编辑 .env，至少设置长度不小于 16 的强随机 JWT_SECRET
npm run start:dev
```

默认监听 `3001`，健康检查为 `http://localhost:3001/api/health`。生产环境设置 `NODE_ENV=production` 后，应用启动会执行 TypeORM 迁移；开发环境使用 `synchronize`。

## 环境变量

```env
NODE_ENV=development
PORT=3001
DB_PATH=./data/momoblog.db
JWT_SECRET=<强随机密钥>
CLIENT_ORIGIN=http://localhost:5175
SITE_URL=http://localhost:5175
UPLOAD_DIR=./images
```

生产环境的 `NODE_ENV` 只能是 `production`，且必须配置有效的 `JWT_SECRET`、`CLIENT_ORIGIN` 和 `SITE_URL`；未知的环境值、缺少关键配置或错误的站点地址会在启动时失败。`.env`、SQLite 数据、上传文件、日志和构建产物都已加入忽略规则，不得提交到 Git。

## 构建与生产启动

```powershell
npm run build
npm run start:prod
```

首次填充演示数据可在构建后执行 `SEED_ADMIN_PASSWORD=<一次性演示密码> node dist/seed.js`；该命令会清空现有用户、动态、评论和点赞，禁止用于真实数据环境。密码只从环境变量读取，不会写入仓库或日志。

## 目录结构

```text
src/
├── entities/       # TypeORM 实体
├── migrations/     # 生产数据库迁移
├── modules/        # auth、users、posts、comments、likes、follows、notifications、upload
├── data-source.ts  # TypeORM CLI 数据源
├── seed.ts         # 演示数据初始化
└── main.ts         # NestJS 入口与全局安全策略
```

## 相关文档

- 根目录 [PROJECT-WIKI.md](../PROJECT-WIKI.md)
- 根目录 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
- 根目录 [ROADMAP.md](../ROADMAP.md)
